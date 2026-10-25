/** Shared by the server layout and the client toggle; must not import client modules. */
export const THEME_KEY = 'captidict.theme'

/** Inline, pre-hydration script: saved theme, else the device setting. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t}catch(e){}})()`
