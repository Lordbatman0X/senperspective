sed -i '/const { articles, language, siteSettings } = useStore();/a\
  const normalizedId = (categoryId || "").toLowerCase().trim();\
  useEffect(() => {\
    window.scrollTo(0, 0);\
  }, [categoryId]);\
  if (normalizedId === "sports" || normalizedId === "sport" || normalizedId === "larene" || normalizedId === "arene") {\
    return <LArenePage />;\
  }\
' src/pages/CategoryPage.tsx
