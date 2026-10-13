export const COLOR_MODE_STORAGE_KEY = "color-mode";

export const themeBootScript = `(function(){try{var mode=localStorage.getItem('${COLOR_MODE_STORAGE_KEY}')||'system';var hour=new Date().getHours();var night=hour>=19||hour<7;var dark=mode==='dark'||(mode==='system'&&(window.matchMedia('(prefers-color-scheme: dark)').matches||night));document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;
