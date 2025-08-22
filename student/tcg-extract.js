document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("fileInput");

  // Define reusable function to process PDF buffer
  async function processPDF(typedarray) {
    const pdf = await pdfjsLib.getDocument(typedarray).promise;
    const lines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const items = content.items;

      let currentLine = [];
      let lastY = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const str = item.str.trim();
        const y = Math.round(item.transform[5]);

        if (str === "") continue;

        if (lastY === null || Math.abs(lastY - y) <= 2) {
          currentLine.push(str);
        } else {
          lines.push(currentLine.join(" "));
          currentLine = [str];
        }
        lastY = y;
      }

      if (currentLine.length) {
        lines.push(currentLine.join(" "));
      }
    }

    window.studentCourseHistory = extractFromLines(lines);
    const jsonData = extractFromLines(lines);
    console.log(JSON.stringify(jsonData, null, 2));

    if (typeof termGPA === "function") termGPA();
    if (typeof updateCumulativeGPA === "function") updateCumulativeGPA();
    if (typeof updateUnitProgress === "function") updateUnitProgress();
    if (typeof residency === "function") residency();
    if (typeof otherScorecards === "function") otherScorecards();
    
    if (typeof applyFulfilledSelections === "function") applyFulfilledSelections();
    if (typeof plotCompleted === "function") plotCompleted();
    if (typeof runModel === "function") runModel();
    if (typeof previewSPMF === 'function') previewSPMF();
  }

  // If there's already a saved file in localStorage, load it
  const savedBase64 = localStorage.getItem("uploadedPDF");
  if (savedBase64) {
    const binaryString = atob(savedBase64);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }
    processPDF(byteArray);
  }

  // Handle new uploads
  if (fileInput) {
    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file || file.type !== "application/pdf") return;

      const reader = new FileReader();
      reader.onload = function () {
        // 🔐 Save PDF to localStorage as base64
        const base64String = btoa(
          new Uint8Array(reader.result).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        localStorage.setItem("uploadedPDF", base64String);

        // 🔄 Parse the PDF immediately
        const typedarray = new Uint8Array(reader.result);
        processPDF(typedarray);
      };
      reader.readAsArrayBuffer(file);
    });
  }
});


function extractFromLines(lines) {
  const grouped = {};

  // Patterns
  const courseGradePattern = /([A-Z]{2,10}\s?\d{1,3}(?:\.\d+)?[a-zA-Z\*]*)(?:.*?)\s+([1-5]\.\d{2}|INC|DRP|S|U)(?:\s+([1-5]\.\d{2}|INC|DRP|S|U))?\b/;
  const yearPattern = /^\d{4}\s*[-–]\s*\d{4}$/;
  const semesterOnlyPattern = /^(FIRST SEMESTER|SECOND SEMESTER|TMIDYEAR)$/i;

  let currentYear = null;
  let currentTerm = null;
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match academic year
    if (yearPattern.test(line)) {
      currentYear = line.replace(/\s+/g, " ").trim();
      continue;
    }

    // Match semester label
    const semMatch = semesterOnlyPattern.exec(line.toUpperCase());
    if (semMatch && currentYear) {
      currentTerm = semMatch[1].toUpperCase();
      // Extract YY–ZZ
      const shortYear = currentYear.replace(/^20(\d{2})[-–]20(\d{2})$/, '$1-$2');

      // Convert term to shortened format
      let formattedTerm = currentTerm
        .replace("FIRST", "1ST")
        .replace("SECOND", "2ND")
        .replace("SEMESTER", "SEM")
        .replace("TMIDYEAR", "MIDYR");

      currentKey = `AY ${shortYear} ${formattedTerm}`;

      if (!grouped[currentKey]) grouped[currentKey] = [];
      continue;
      
    }

    // Match course + grade
    const match = courseGradePattern.exec(line);
      if (match) {
      const code = match[1].replace(/\s+/g, " ").replace(/\*$/, "").trim();
      let gradeRaw = match[3] || match[2];
      let grade;

      // Keep non-numeric grades as-is (e.g., "INC", "DRP", "S", "U"), otherwise parse
      if (["INC", "DRP", "S", "U"].includes(gradeRaw)) {
        grade = gradeRaw;
      } else {
        const parsed = parseFloat(gradeRaw);
        grade = !isNaN(parsed) ? parsed : null;
      }

      if (grade !== null) {
        grouped[currentKey].push({ code, grade });
      }
    }           

  }

  const jsonArray = Object.entries(grouped).map(([term, courses]) => ({
    term,
    courses
  }));

  return jsonArray;
}

