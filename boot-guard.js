function bootErr(m){var s=document.querySelector('#boot small');if(s){s.style.cssText='color:#b00020;white-space:normal;max-width:300px;text-align:center;font-size:12px';s.textContent='Error: '+m}}
addEventListener('error',function(e){bootErr(e.message||('gagal muat '+(e.target&&(e.target.src||e.target.href))))},true);
addEventListener('unhandledrejection',function(e){bootErr((e.reason&&e.reason.message)||e.reason)});
