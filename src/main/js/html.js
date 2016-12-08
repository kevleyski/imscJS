/* 
 * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

;
(function (imscHTML, imscNames, imscStyles) { // wrapper for non-node envs


    imscHTML.render = function (isd, div, imgResolver, width, height) {

        /* maintain aspect ratio if specified */

        height = height || div.clientHeight;
        width = width || div.clientWidth;

        if (isd.aspectRatio !== null) {

            var twidth = height * isd.aspectRatio;

            if (twidth > width) {

                height = Math.round(width / isd.aspectRatio);

            } else {

                width = twidth;

            }

        }

        var rootcontainer = document.createElement("div");

        rootcontainer.style.position = "relative";
        rootcontainer.style.width = width + "px";
        rootcontainer.style.height = height + "px";
        rootcontainer.style.margin = "auto";
        rootcontainer.style.top = 0;
        rootcontainer.style.bottom = 0;
        rootcontainer.style.left = 0;
        rootcontainer.style.right = 0;

        var context = {
            h: height,
            w: width,
            regionH: null,
            regionW: null,
            imgResolver: imgResolver,
            isd: isd
        };

        div.appendChild(rootcontainer);

        for (var i in isd.contents) {

            processElement(context, rootcontainer, isd.contents[i]);

        }

    };

    function processElement(context, dom_parent, isd_element) {

        var e;

        if (isd_element.kind === 'region') {

            e = document.createElement("div");
            e.style.position = "absolute";

        } else if (isd_element.kind === 'body') {

            e = document.createElement("div");

        } else if (isd_element.kind === 'div') {

            e = document.createElement("div");

        } else if (isd_element.kind === 'p') {

            e = document.createElement("p");

        } else if (isd_element.kind === 'span') {

            e = document.createElement("span");

            //e.textContent = isd_element.text;

        } else if (isd_element.kind === 'br') {

            e = document.createElement("br");

        }

        /* override UA default margin */

        e.style.margin = "0";

        /* tranform TTML styles to CSS styles */

        for (var i in STYLING_MAP_DEFS) {

            var sm = STYLING_MAP_DEFS[i];

            var attr = isd_element.styleAttrs[sm.qname];

            if (attr !== undefined && sm.map !== null) {

                sm.map(context, e, isd_element, attr);

            }

        }

        var proc_e = e;


        // handle multiRowAlign and linePadding

        var mra = isd_element.styleAttrs[imscStyles.byName.multiRowAlign.qname];

        if (mra && mra !== "auto") {

            var s = document.createElement("span");

            s.style.display = "inline-block";

            s.style.textAlign = mra;

            e.appendChild(s);

            proc_e = s;

            context.mra = mra;

        }

        var lp = isd_element.styleAttrs[imscStyles.byName.linePadding.qname];

        if (lp && lp > 0) {

            context.lp = lp;

        }

        // wrap characters in spans to find the line wrap locations

        if (isd_element.kind === "span" && isd_element.text) {

            if (context.lp || context.mra) {



                for (var j = 0; j < isd_element.text.length; j++) {

                    var span = document.createElement("span");

                    span.textContent = isd_element.text.charAt(j);

                    e.appendChild(span);

                }



                // clean-up the span

                /*var child = e.firstChild;
                 
                 var acctext = "";
                 
                 while (child) {
                 
                 var cur_child = child;
                 
                 child = child.nextSibling;
                 
                 if (cur_child.nodeName === "br" || child === null) {
                 
                 e.insertBefore(document.createTextNode(acctext), cur_child);
                 
                 acctext = "";
                 
                 } else {
                 
                 acctext += cur_child.textContent;
                 
                 e.removeChild(cur_child);
                 
                 }
                 
                 }*/
            } else {
                e.textContent = isd_element.text;
            }
        }


        dom_parent.appendChild(e);

        for (var k in isd_element.contents) {

            processElement(context, proc_e, isd_element.contents[k]);

        }



        // handle linePadding and multirow Align

        if ((context.lp || context.mra) && isd_element.kind === "p") {

            // insert explicit line breaks for multirow align and line padding

            insertExplicitBrAndPadding(proc_e, context.lp, null);

            if (context.lp) delete context.lp;
            if (context.mra) delete context.mra;

        }

    }

    function insertExplicitBrAndPadding(e, lp, boundingrecttop) {

        var child = e.firstChild;

        var last_top = boundingrecttop;

        while (child) {

            if (child.nodeType === Node.ELEMENT_NODE) {

                var cur_top = child.getBoundingClientRect().top;

                // has the top of the bounding rect changed
                // TODO: this fails on vertical scripts

                if (cur_top !== last_top && child.localName !== "br") {

                    // apparently bounding rects for <br> are not the same as other inline elements, so skip it

                    if (child.previousSibling !== null && child.previousSibling.localName !== "br") {

                        e.insertBefore(document.createElement("br"), child);

                        // rewind to handle line padding

                        child = child.previousSibling.previousSibling;

                    } else {

                        last_top = cur_top;

                    }

                }

                if (lp && lp > 0) {
                    
                     var s;

                    if ((child.previousSibling === null && boundingrecttop === null) ||
                            (child.previousSibling !== null && child.previousSibling.localName === "br")) {

                        s = "-0.5em 0 " + getComputedStyle(child).backgroundColor;

                        if (child.style.boxShadow)
                            s += "," + child.style.boxShadow;

                        child.style.boxShadow = s;

                    }

                    if ((boundingrecttop === null && child.nextSibling === null) ||
                            (child.nextSibling !== null && child.nextSibling.localName === "br")) {

                        s = "0.5em 0 " + getComputedStyle(child).backgroundColor;

                        if (child.style.boxShadow)
                            s += "," + child.style.boxShadow;

                        child.style.boxShadow = s;
                    }

                }

                insertExplicitBrAndPadding(child, lp, last_top);
            }

            child = child.nextSibling;

        }

    }


    function HTMLStylingMapDefintion(qName, mapFunc) {
        this.qname = qName;
        this.map = mapFunc;
    }

    var STYLING_MAP_DEFS = [

        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling backgroundColor",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.backgroundColor = "rgba(" +
                            attr[0].toString() + "," +
                            attr[1].toString() + "," +
                            attr[2].toString() + "," +
                            (attr[3] / 255).toString() +
                            ")";
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling color",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.color = "rgba(" +
                            attr[0].toString() + "," +
                            attr[1].toString() + "," +
                            attr[2].toString() + "," +
                            (attr[3] / 255).toString() +
                            ")";
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling direction",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.direction = attr;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling display",
                function (context, dom_element, isd_element, attr) {}
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling displayAlign",
                function (context, dom_element, isd_element, attr) {

                    /* see https://css-tricks.com/snippets/css/a-guide-to-flexbox/ */

                    /* TODO: is this affected by writing direction? */

                    dom_element.style.display = "flex";
                    dom_element.style.flexDirection = "column";


                    if (attr === "before") {

                        dom_element.style.justifyContent = "flex-start";

                    } else if (attr === "center") {

                        dom_element.style.justifyContent = "center";

                    } else if (attr === "after") {

                        dom_element.style.justifyContent = "flex-end";
                    }

                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling extent",
                function (context, dom_element, isd_element, attr) {
                    /* TODO: this is super ugly */

                    context.regionH = (attr.h * context.h);
                    context.regionW = (attr.w * context.w);

                    /* 
                     * CSS height/width are measured against the content rectangle,
                     * whereas TTML height/width include padding
                     */

                    var hdelta = 0;
                    var wdelta = 0;

                    var p = isd_element.styleAttrs["http://www.w3.org/ns/ttml#styling padding"];

                    if (!p) {

                        /* error */

                    } else {

                        hdelta = (p[0] + p[2]) * context.h;
                        wdelta = (p[1] + p[3]) * context.w;

                    }

                    dom_element.style.height = (context.regionH - hdelta) + "px";
                    dom_element.style.width = (context.regionW - wdelta) + "px";

                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling fontFamily",
                function (context, dom_element, isd_element, attr) {

                    var rslt = [];

                    /* per IMSC1 */

                    for (var i in attr) {

                        if (attr[i] === "monospaceSerif") {

                            rslt.push("Courier New");
                            rslt.push('"Liberation Mono"');
                            rslt.push("Courier");
                            rslt.push("monospace");

                        } else if (attr[i] === "proportionalSansSerif") {

                            rslt.push("Arial");
                            rslt.push("Helvetica");
                            rslt.push('"Liberation Sans"');
                            rslt.push("sans-serif");

                        } else if (attr[i] === "monospace") {

                            rslt.push("monospace");

                        } else if (attr[i] === "sansSerif") {

                            rslt.push("sans-serif");

                        } else if (attr[i] === "serif") {

                            rslt.push("serif");

                        } else if (attr[i] === "monospaceSansSerif") {

                            rslt.push("Consolas");
                            rslt.push("monospace");

                        } else if (attr[i] === "proportionalSerif") {

                            rslt.push("serif");

                        } else {

                            rslt.push(attr[i]);

                        }

                    }

                    dom_element.style.fontFamily = rslt.join(",");
                }
        ),

        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling fontSize",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.fontSize = (attr * context.h) + "px";
                }
        ),

        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling fontStyle",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.fontStyle = attr;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling fontWeight",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.fontWeight = attr;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling lineHeight",
                function (context, dom_element, isd_element, attr) {
                    if (attr === "normal") {

                        var fs = isd_element.styleAttrs["http://www.w3.org/ns/ttml#styling fontSize"];

                        dom_element.style.lineHeight = (fs * 1.2 * context.h) + "px";

                    } else {

                        dom_element.style.lineHeight = (attr * context.h) + "px";
                    }
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling opacity",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.opacity = attr;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling origin",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.top = (attr.h * context.h) + "px";
                    dom_element.style.left = (attr.w * context.w) + "px";
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling overflow",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.overflow = attr;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling padding",
                function (context, dom_element, isd_element, attr) {

                    /* attr: top,left,bottom,right*/

                    /* style: top right bottom left*/

                    var rslt = [];

                    rslt[0] = (attr[0] * context.h) + "px";
                    rslt[1] = (attr[3] * context.w) + "px";
                    rslt[2] = (attr[2] * context.h) + "px";
                    rslt[3] = (attr[1] * context.w) + "px";

                    dom_element.style.padding = rslt.join(" ");
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling showBackground",
                null
                ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling textAlign",
                function (context, dom_element, isd_element, attr) {
                    
                    var ta;
                    var dir = isd_element.styleAttrs[imscStyles.byName.direction.qname];
                    
                    /* handle UAs that do not understand start or end */
                    
                    if (attr === "start") {
                                                   
                        ta = dir === "ltr" ? "left" : "right";
 
                    } else if (attr === "end") {
                        
                        ta = dir === "ltr" ? "right" : "left";
                        
                    } else {
                        
                        ta = attr;
                        
                    }
                    
                    dom_element.style.textAlign = ta;
                    
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling textDecoration",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.textDecoration = attr.join(" ").replace("lineThrough", "line-through");
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling textOutline",
                function (context, dom_element, isd_element, attr) {

                    /* ignores thickness due to CSS limitations */

                    if (attr === "none") {

                        dom_element.style.textShadow = "";

                    } else {

                        dom_element.style.textShadow = "rgba(" +
                                attr.color[0].toString() + "," +
                                attr.color[1].toString() + "," +
                                attr.color[2].toString() + "," +
                                (attr.color[3] / 255).toString() +
                                ")" + " 0px 0px 1px";

                    }
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling unicodeBidi",
                function (context, dom_element, isd_element, attr) {

                    var ub;

                    if (attr === 'bidiOverride') {
                        ub = "bidi-override";
                    } else {
                        ub = attr;
                    }

                    dom_element.style.unicodeBidi = ub;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling visibility",
                function (context, dom_element, isd_element, attr) {
                    dom_element.style.visibility = attr;
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling wrapOption",
                function (context, dom_element, isd_element, attr) {

                    if (attr === "wrap") {

                        if (isd_element.space === "preserve") {
                            dom_element.style.whiteSpace = "pre-wrap";
                        } else {
                            dom_element.style.whiteSpace = "normal";
                        }

                    } else {

                        if (isd_element.space === "preserve") {

                            dom_element.style.whiteSpace = "pre";

                        } else {
                            dom_element.style.whiteSpace = "noWrap";
                        }

                    }

                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling writingMode",
                function (context, dom_element, isd_element, attr) {
                    if (attr === "lrtb" || attr === "lr") {

                        dom_element.style.writingMode = "horizontal-tb";

                    } else if (attr === "rltb" || attr === "rl") {

                        dom_element.style.writingMode = "horizontal-tb";

                    } else if (attr === "tblr") {

                        dom_element.style.writingMode = "vertical-lr";

                    } else if (attr === "tbrl" || attr === "tb") {

                        dom_element.style.writingMode = "vertical-rl";

                    }
                }
        ),
        new HTMLStylingMapDefintion(
                "http://www.w3.org/ns/ttml#styling zIndex",
                null
                ),
        new HTMLStylingMapDefintion(
                "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt backgroundImage",
                function (context, dom_element, isd_element, attr) {

                    if (context.imgResolver !== null && attr !== null) {

                        var img = document.createElement("img");

                        img.src = context.imgResolver(attr);
                        img.height = context.regionH;
                        img.width = context.regionW;

                        dom_element.appendChild(img);
                    }
                }
        )
    ];

    var STYLMAP_BY_QNAME = {};

    for (var i in STYLING_MAP_DEFS) {

        STYLMAP_BY_QNAME[STYLING_MAP_DEFS[i].qname] = STYLING_MAP_DEFS[i];
    }

})(typeof exports === 'undefined' ? this.imscHTML = {} : exports,
        typeof imscNames === 'undefined' ? require("./names") : imscNames,
        typeof imscStyles === 'undefined' ? require("./styles") : imscStyles);