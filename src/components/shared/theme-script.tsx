// Runs before paint so the saved theme applies without a flash.
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem("dk-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
