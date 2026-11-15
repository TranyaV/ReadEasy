export const PROFILE_STORAGE_KEY = "readease:reading-profile";

/**
 * Inline script for <head>: applies the saved light/dark appearance before first paint
 * so there's no flash of the wrong theme. Self-contained — it can't import anything.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PROFILE_STORAGE_KEY,
)})||"{}");var a=p.appearance;var d=a==="dark"||(a==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
