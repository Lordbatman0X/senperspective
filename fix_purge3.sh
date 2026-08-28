perl -0777 -pi -e 's/  const handlePurgeDrafts = async \(\) => \{\n    if \(\!window.confirm.*?  \};\n//gs' src/components/admin/DraftGenerationTab.tsx
