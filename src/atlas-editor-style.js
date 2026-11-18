export const editorStyle=`
#pl-editor{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:#182920a8;color:var(--ink);font:13px/1.45 var(--sans)}
#pl-editor.open{display:flex}
#pl-editor .ed-window{width:min(1080px,95vw);height:min(820px,94dvh);display:flex;flex-direction:column;overflow:hidden;position:relative;background:var(--white);border:1px solid var(--ink);box-shadow:0 10px 40px #172b2039}
#pl-editor .ed-head,#pl-editor .ed-foot{display:flex;align-items:center;gap:8px;flex:none;padding:12px 20px;background:var(--white)}
#pl-editor .ed-head{border-bottom:1px solid var(--ink)}
#pl-editor .ed-title{margin:0 auto 0 0;display:flex;align-items:center;gap:10px;font:700 21px/1.25 var(--serif)}
#pl-editor .ed-title svg{color:var(--rust)}
#pl-editor .ed-foot{border-top:1px solid var(--ink)}
#pl-editor .ed-foot-message{flex:1;min-width:0;color:var(--muted);font-size:12px}
#pl-editor button{min-height:34px;white-space:normal}
#pl-editor button svg{width:16px;height:16px}
#pl-editor .ed-symbol{width:36px;padding:0}
#pl-editor button.ed-green{border-color:var(--green);background:var(--green);color:#fff}
#pl-editor button.ed-green:hover{background:#305d4b}
#pl-editor .ed-red{color:var(--rust)}
#pl-editor .ed-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(295px,1fr);overflow:hidden}
#pl-editor .ed-preview,#pl-editor .ed-side{min-width:0;overflow:auto;overscroll-behavior:contain}
#pl-editor .ed-preview{padding:20px;color:var(--green);border-right:1px solid var(--line);background:var(--wash)}
#pl-editor .ed-plate-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:14px}
#pl-editor .ed-plate-head h3,#pl-editor .ed-card h3{font:700 16px/1.25 var(--serif);margin:0}
#pl-editor .ed-plate-head small{font:12px var(--mono);color:var(--muted)}
#pl-editor .ed-board-wrap{display:flex;align-items:center;justify-content:center;width:100%;padding:9px;background:var(--white);border:1px solid var(--line)}
#pl-editor .ed-board{--rows:5;--cols:5;display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));width:min(100%,calc(48dvh * var(--cols) / var(--rows)));gap:1px;padding:1px;background:#95a99b;touch-action:manipulation}
#pl-editor .ed-cell{position:relative;min-height:0;min-width:0;aspect-ratio:1;padding:0;display:grid;place-items:center;border:0;border-radius:0;background:#f6f8f1;cursor:crosshair}
#pl-editor .ed-cell:empty:before,#pl-editor .ed-cell:not(:has(.ed-flower)):before{position:absolute;content:"+";font:12px/1 var(--mono);color:#aab9ac}
#pl-editor .ed-cell.hole{background:repeating-linear-gradient(135deg,#c3cec3 0 1px,#e0e7dd 1px 5px)}
#pl-editor .ed-cell.hole:before{display:none}
#pl-editor .ed-cell:hover,#pl-editor .ed-cell:focus-visible{background:#e5eddf;outline:2px solid var(--green);outline-offset:-2px;z-index:1}
#pl-editor .ed-cell:active{background:#cfdfc9}
#pl-editor .ed-cell svg.ed-flower{width:78%;height:78%;max-width:64px;max-height:64px;pointer-events:none}
#pl-editor .ed-coordinate{position:absolute;right:2px;bottom:2px;font:8px/1 var(--mono);color:#607467;pointer-events:none}
#pl-editor .ed-stats{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--muted);font-size:12px;margin:9px 0 20px}
#pl-editor .ed-chip:first-child{font-family:var(--mono)}
#pl-editor .ed-card{padding:15px 18px;border-bottom:1px solid var(--line)}
#pl-editor .ed-card h3{margin:0 0 10px;color:var(--ink)}
#pl-editor .ed-row{display:flex;gap:7px;align-items:center;margin:7px 0;flex-wrap:wrap}
#pl-editor .ed-row:last-child{margin-bottom:0}
#pl-editor .ed-row label{font-size:12px;color:var(--muted)}
#pl-editor .ed-row label:not(:first-child){margin-left:6px}
#pl-editor input{height:32px;padding:4px 7px;min-width:0;background:#fff;border:1px solid var(--line);border-radius:2px}
#pl-editor .ed-row input[type=text]{flex:1}
#pl-editor input[type=number]{width:55px;font:13px var(--mono)}
#pl-editor .ed-paints{padding:14px 0 0;border-top:1px solid var(--line);border-bottom:0}
#pl-editor .ed-tools{display:flex;gap:5px;flex-wrap:wrap}
#pl-editor .ed-swatch{position:relative;width:40px;height:38px;padding:0;line-height:1}
#pl-editor .ed-swatch svg{width:25px;height:25px}
#pl-editor .ed-tools .selected{background:#dbe7dd;border-color:var(--green);box-shadow:inset 0 -2px var(--green)}
#pl-editor .ed-tips,#pl-editor .ed-empty{margin:5px 0 0;font-size:12px;color:var(--muted)}
#pl-editor .ed-result{padding:8px 10px;font-size:12px;min-height:32px;color:var(--muted);border-left:2px solid var(--line);background:#eff2ee}
#pl-editor .ed-result.ok{color:var(--green);background:#edf4eb;border-color:var(--green)}
#pl-editor .ed-result.bad{background:var(--rust-wash);color:var(--rust);border-color:var(--rust)}
#pl-editor .ed-library-item{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--line)}
#pl-editor .ed-library-item strong{flex:1;min-width:85px;font-size:12px;overflow-wrap:anywhere}
#pl-editor .ed-library-item small{font-weight:400;color:var(--muted)}
#pl-editor .ed-library-item button{padding:3px 5px;min-height:28px;font-size:12px}
#pl-editor .ed-library>button{margin-top:10px}
#pl-editor .ed-hidden{display:none!important}
#pl-editor .ed-confirm{position:absolute;inset:0;background:#182920a8;display:grid;place-items:center;padding:16px}
#pl-editor .ed-confirm>div{border:1px solid var(--ink);background:var(--white);max-width:400px;padding:22px}
#pl-editor .ed-confirm h3{margin:0;font:700 19px var(--serif)}
#pl-editor .ed-confirm p{color:var(--muted)}
@media(max-width:820px){#pl-editor .ed-window{width:100%;height:100dvh;border:0}#pl-editor .ed-head,#pl-editor .ed-foot{padding:8px 12px;gap:5px}#pl-editor .ed-title{font-size:18px}#pl-editor .ed-body{display:block;overflow:auto;overscroll-behavior:contain}#pl-editor .ed-preview,#pl-editor .ed-side{overflow:visible}#pl-editor .ed-preview{padding:14px;border-right:0;border-bottom:1px solid var(--line)}#pl-editor .ed-card:not(.ed-paints){padding:14px}#pl-editor .ed-board{width:min(100%,calc(48dvh * var(--cols) / var(--rows)))}#pl-editor .ed-foot{flex-wrap:wrap;padding-bottom:max(8px,env(safe-area-inset-bottom))}#pl-editor .ed-foot-message:empty{display:none}#pl-editor .ed-foot-message:not(:empty){flex-basis:100%}#pl-editor .ed-foot button{flex:1;min-width:0;padding:5px 3px;font-size:12px;gap:3px;min-height:38px}#pl-editor .ed-coordinate{display:none}#pl-editor .ed-swatch{min-width:40px;min-height:40px}#pl-editor .ed-stats{margin-bottom:12px}}
`;
