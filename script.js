async function run() {
  const res = await fetch("https://view-point-press.base44.app");
  const html = await res.text();
  const indexCssMatch = html.match(/src="([^"]+main\.[a-zA-Z0-9_-]+\.js)"/);
  const cssMatch = html.match(/href="([^"]+index-[a-zA-Z0-9_-]+\.css)"/);
  
  if (cssMatch) {
    const cssUrl = "https://view-point-press.base44.app" + cssMatch[1];
    console.log("CSS URL:", cssUrl);
    const cssRes = await fetch(cssUrl);
    const css = await cssRes.text();
    console.log(css.substring(0, 100)); // Just to confirm
  } else {
    console.log("No CSS found");
  }
  
  console.log("--- HTML EXTRACT ---");
  console.log(html.substring(0, 5000));
}

run();
