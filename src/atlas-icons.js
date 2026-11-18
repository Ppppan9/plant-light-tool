// Subset of lucide-static 0.468.0, vendored for the offline tool.
/*! ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. */
const paths = {
"sprout":"<path d=\"M7 20h10\" /> <path d=\"M10 20c5.5-2.5.8-6.4 3-10\" /> <path d=\"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z\" /> <path d=\"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z\" />",
"grid-2x2":"<path d=\"M12 3v18\" /> <path d=\"M3 12h18\" /> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" />",
"sliders-horizontal":"<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\" /> <line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\" /> <line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\" /> <line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\" /> <line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\" /> <line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\" /> <line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\" /> <line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\" /> <line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\" />",
"chevrons-down-up":"<path d=\"m7 20 5-5 5 5\" /> <path d=\"m7 4 5 5 5-5\" />",
"chevrons-up-down":"<path d=\"m7 15 5 5 5-5\" /> <path d=\"m7 9 5-5 5 5\" />",
"search":"<circle cx=\"11\" cy=\"11\" r=\"8\" /> <path d=\"m21 21-4.3-4.3\" />",
"rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /> <path d=\"M3 3v5h5\" />",
"shuffle":"<path d=\"m18 14 4 4-4 4\" /> <path d=\"m18 2 4 4-4 4\" /> <path d=\"M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22\" /> <path d=\"M2 6h1.972a4 4 0 0 1 3.6 2.2\" /> <path d=\"M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45\" />",
"camera":"<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\" /> <circle cx=\"12\" cy=\"13\" r=\"3\" />",
"upload":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"17 8 12 3 7 8\" /> <line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\" />",
"download":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"7 10 12 15 17 10\" /> <line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\" />",
"play":"<polygon points=\"6 3 20 12 6 21 6 3\" />",
"palette":"<circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" /> <path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\" />",
"timer":"<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\" /> <line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\" /> <circle cx=\"12\" cy=\"14\" r=\"8\" />",
"audio-lines":"<path d=\"M2 10v3\" /> <path d=\"M6 6v11\" /> <path d=\"M10 3v18\" /> <path d=\"M14 8v7\" /> <path d=\"M18 5v13\" /> <path d=\"M22 10v3\" />",
"mouse-pointer-2":"<path d=\"M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z\" />",
"video":"<path d=\"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5\" /> <rect x=\"2\" y=\"6\" width=\"14\" height=\"12\" rx=\"2\" />",
"film":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M7 3v18\" /> <path d=\"M3 7.5h4\" /> <path d=\"M3 12h18\" /> <path d=\"M3 16.5h4\" /> <path d=\"M17 3v18\" /> <path d=\"M17 7.5h4\" /> <path d=\"M17 16.5h4\" />",
"box":"<path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\" /> <path d=\"m3.3 7 8.7 5 8.7-5\" /> <path d=\"M12 22V12\" />",
"smartphone":"<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\" /> <path d=\"M12 18h.01\" />",
"flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\" /> <line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\" />",
"save":"<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\" /> <path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\" /> <path d=\"M7 3v4a1 1 0 0 0 1 1h7\" />",
"undo-2":"<path d=\"M9 14 4 9l5-5\" /> <path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\" />",
"redo-2":"<path d=\"m15 14 5-5-5-5\" /> <path d=\"M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13\" />",
"x":"<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />",
"eraser":"<path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21\" /> <path d=\"M22 21H7\" /> <path d=\"m5 11 9 9\" />",
"grid-3x3":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M3 9h18\" /> <path d=\"M3 15h18\" /> <path d=\"M9 3v18\" /> <path d=\"M15 3v18\" />",
"shapes":"<path d=\"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z\" /> <rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\" /> <circle cx=\"17.5\" cy=\"17.5\" r=\"3.5\" />",
"settings-2":"<path d=\"M20 7h-9\" /> <path d=\"M14 17H5\" /> <circle cx=\"17\" cy=\"17\" r=\"3\" /> <circle cx=\"7\" cy=\"7\" r=\"3\" />",
};
export function icon(name){const node=document.createElementNS("http://www.w3.org/2000/svg","svg");for(const [key,value]of Object.entries({viewBox:"0 0 24 24",width:18,height:18,fill:"none",stroke:"currentColor","stroke-width":1.65,"stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true",focusable:"false",class:"atlas-icon"}))node.setAttribute(key,value);node.innerHTML=paths[name]||paths.sprout;return node;}
