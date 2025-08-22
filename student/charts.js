google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(termGPA);
google.charts.setOnLoadCallback(drawCourseGradeTrendChart);
google.charts.setOnLoadCallback(passingRate);
google.charts.setOnLoadCallback(difficultyLevel);
google.charts.setOnLoadCallback(enrollment);

//fetching data from json files
async function fetchJSON(file) {
  try {
      let response = await fetch(file);
      return await response.json();
  } catch (error) {
      console.error("Error fetching JSON:", error);
      return null;
  }
}

//calculating GPA per term
async function calculateGPAData() {
  try {
    const studentCourseHistory = window.studentCourseHistory;
      //const studentCourseHistory = await fetchJSON('../student/data/student-course-history.json');
      const coursesData = await fetchJSON('../student/data/courses.json');

      if (!studentCourseHistory || !coursesData) {
          console.error("Error: Missing required data.");
          return [];
      }

      const allCourses = Object.values(coursesData).flat(); 
      const courseMap = new Map(allCourses.map(c => [c.code, c.units]));

      let gpaData = [['Academic Term', 'GPA']]; // First row (headers) for Google Charts

      studentCourseHistory.forEach(termData => {
          let totalWeighted = 0;
          let totalUnits = 0;

          termData.courses.forEach(course => {
              const units = courseMap.get(course.code) || 0;
              if (!isNaN(course.grade) && units > 0) {
                  totalWeighted += course.grade * units;
                  totalUnits += units;
              }
          });

          if (totalUnits > 0) {
              const gpa = parseFloat((totalWeighted / totalUnits).toFixed(2));
              gpaData.push([termData.term, gpa]); // Add computed term and GPA
          }
      });

      console.log("Generated GPA Data:", gpaData); // Debugging output
      return gpaData;
  } catch (error) {
      console.error("Error processing GPA:", error);
      return [];
  }
}

//Term vs GPA chart
async function termGPA() {
  const gpaData = await calculateGPAData();
  
  if (gpaData.length <= 1) {
      console.error("No valid GPA data found.");
      return;
  }

  // Modify the data structure to include annotations
  let updatedData = [['Term', 'GPA', { role: 'annotation' }]];

  gpaData.slice(1).forEach(row => {
      updatedData.push([row[0], row[1], row[1].toFixed(2)]); // Term, GPA, Annotation (formatted GPA)
  });

  var data = google.visualization.arrayToDataTable(updatedData);

  var options = {
      colors: ['#00563f'],
      hAxis: { textStyle: { fontSize: 11, color: '#333'} },
      vAxis: {
          textStyle: { fontSize: 11},
          minValue: 1, 
          maxValue: 3,
          direction: -1, 
          viewWindow: { min: 1, max: 3 }, 
          gridlines: { count: 5, color: '#ccc' }
      },
      legend: { position: 'none' },
      pointShape: 'circle',
      pointSize: 7,
      chartArea: { left: 30, top: 5, right: 10, bottom: 40, width: '90%', height: '80%' },
      series: {
        0: { annotations: {
                style: 'point',  // Places annotations directly on the data points
                textStyle: {
                    fontSize: 12,
                    color: '#000',  // Black text for readability
                    bold: true }}
            }
      }
  };

  var chart = new google.visualization.LineChart(document.getElementById('chart1_div'));
  chart.draw(data, options);

   // Resize event listener
   window.addEventListener('resize', function() {
    chart.draw(data, options);
  });

   // Select the first data point by default
   var firstTerm = data.getValue(0, 0); // Get the first term value

   updateTable(firstTerm);
   scholasticStanding(firstTerm);
   //updateCourseGradeTrends(firstTerm);
   //updateDifficultyMatrix(firstTerm);
   document.getElementById("termLabel").innerHTML = `<span class="txt-maroon">${firstTerm}</span>`;
   //document.getElementById("termLabel").textContent = `TERM ${firstTerm}`;
   //document.getElementById("insightsLabel").textContent = `Insights on TERM ${firstTerm}`;
  

  google.visualization.events.addListener(chart, 'select', function () {
    var selection = chart.getSelection();
    if (selection.length > 0) {
        var term = data.getValue(selection[0].row, 0);
        updateTable(term);
        scholasticStanding(term);
        //updateCourseGradeTrends(term);
        //updateDifficultyMatrix(term);
         // Update the term label dynamically
        document.getElementById("termLabel").innerHTML = `<span class="txt-maroon">${term}</span>`;
        //document.getElementById("termLabel").textContent = `TERM ${term}`;
        //document.getElementById("insightsLabel").textContent = `Insights on TERM ${term}`;
        }
});
}

// cumulative GPA
async function updateCumulativeGPA() {
    try {
        const studentCourseHistory = window.studentCourseHistory;
        //const studentCourseHistory = await fetchJSON('../student/data/student-course-history.json');
        const coursesData = await fetchJSON('../student/data/courses.json');

        if (!studentCourseHistory || !coursesData) {
            console.error("Error: Missing required data.");
            return;
        }

        const allCourses = Object.values(coursesData).flat(); 
        const courseMap = new Map(allCourses.map(c => [c.code, c.units]));

        let cumulativeWeighted = 0;
        let cumulativeUnits = 0;

        studentCourseHistory.forEach(termData => {
            termData.courses.forEach(course => {
                const grade = parseFloat(course.grade);
                const units = parseFloat(courseMap.get(course.code));

                // Include only courses with numeric grades and numeric units
                if (!isNaN(grade) && !isNaN(units) && units > 0) {
                    cumulativeWeighted += grade * units;
                    cumulativeUnits += units;
                }
            });
        });

        const cumulativeGPA = cumulativeUnits > 0 ? parseFloat((cumulativeWeighted / cumulativeUnits).toFixed(2)) : null;

        if (cumulativeGPA !== null) {
            // Insert GPA into the <p> element
            document.getElementById("cumulative-gpa").textContent = `${cumulativeGPA}`;
        }
    } catch (error) {
        console.error("Error processing Cumulative GPA:", error);
    }
}

// Call function after the page loads
document.addEventListener("DOMContentLoaded", updateCumulativeGPA);


async function updateTable(selectedTerm) {
    const studentCourseHistory = window.studentCourseHistory;
    //const studentCourseHistory = await fetchJSON('../student/data/student-course-history.json');
    if (!studentCourseHistory) return;

    const termData = studentCourseHistory.find(term => term.term === selectedTerm);
    if (!termData) {
        console.error("No data found for term:", selectedTerm);
        return;
    }

    const performanceLevels = [
        { min: 1, max: 1.49, level: "Outstanding" },
        { min: 1.5, max: 1.99, level: "Above Average" },
        { min: 2, max: 2.49, level: "Competent" },
        { min: 2.5, max: 2.99, level: "Acceptable" },
        { min: 3, max: 3, level: "Minimum Competence" },
        { min: 4, max: 4, level: "At Risk" },
        { min: 5, max: 5, level: "Failed" }
    ];

    function getPerformanceLevel(grade) {
        if (grade === "INC") return "Pending Completion";
        if (grade === "DRP") return "Withdrew";
        if (grade === "S") return "Satisfactory";
        if (grade === "U") return "Unsatisfactory";
        const numericGrade = parseFloat(grade);
        if (!isNaN(numericGrade)) {
            const level = performanceLevels.find(pl => numericGrade >= pl.min && numericGrade <= pl.max);
            return level ? level.level : "Unknown";
        }
        return "Unknown";
    }

    currentCourses = termData.courses.map(course => ({
        code: course.code,
        grade: course.grade,
        performance: getPerformanceLevel(course.grade)
    }));

    updateTableDisplay();
}


function updateTableDisplay() {
    let tableBody = document.getElementById("gradeRemarks");
    tableBody.innerHTML = ""; 

    // 👉 No slicing: display ALL courses at once
    currentCourses.forEach(course => {
        let row = `<tr>
            <td>${course.code}</td>
            <td>${course.grade}</td>
            <td>${course.performance}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

async function scholasticStanding(selectedTerm) {
    const studentCourseHistory = window.studentCourseHistory;
    const coursesData = await fetchJSON('../student/data/courses.json');

    if (!studentCourseHistory || !coursesData) {
        console.error("Error: Missing required data.");
        return;
    }

    const termData = studentCourseHistory.find(term => term.term === selectedTerm);
    if (!termData) {
        console.error(`Term "${selectedTerm}" not found.`);
        return;
    }

    const allCourses = Object.values(coursesData).flat();
    const courseMap = new Map(allCourses.map(c => [c.code, c.units]));

    let enrolledUnits = 0;
    let passedUnits = 0;

    termData.courses.forEach(course => {
        const units = courseMap.get(course.code) || 0;

        if (units > 0) {
            enrolledUnits += units;
        }
        if (
            course.grade !== "DRP" &&
            course.grade !== "U" &&
            parseFloat(course.grade) !== 5 &&
            units > 0
        ) {
            passedUnits += units;
        }
    });

    const standingPercent = enrolledUnits > 0
        ? ((passedUnits / enrolledUnits) * 100).toFixed(2)
        : "0.00";

    let scholasticStanding = "";
    if (standingPercent > 75) {
        scholasticStanding = "Good"
    } else if (standingPercent > 50) {
        scholasticStanding = "Warning";
    } else if (standingPercent > 25) {
        scholasticStanding = "Probation";
    } else if (standingPercent > 0) {
        scholasticStanding = "Dismissal";
    } else if (standingPercent === 0) {
        scholasticStanding = "Permanent Disqualification";
    }

    const standingDisplay = document.getElementById("schoStanding");
    if (standingDisplay) {
        standingDisplay.textContent = `Scholastic Standing: ${scholasticStanding}`;
    }
}

// passing rate
function passingRate() {
    const data = google.visualization.arrayToDataTable([
        ['Attempts', '1 Take', '2 Takes', '3 Takes', '>3'],
        ['Students', 72, 90, 32, 20]
    ]);

    const options = {
        isStacked: 'percent',
        legend: { position: 'none' },
        hAxis: {
        textPosition: 'none'
        },
        vAxis: {
        textPosition: 'none',
        gridlines: { color: 'transparent' }
        },
        chartArea: { width: '100%', height: '40' },
        colors: ['#72f0b2', '#41cf7f', '#28a86f', '#4c8c6a'],
        bar: { groupWidth: '100%' }
    };

    const chart = new google.visualization.BarChart(document.getElementById("chart3_div"));
    chart.draw(data, options);
}

function difficultyLevel() {
    const data = google.visualization.arrayToDataTable([
        ['Level', 'Very easy', 'Eay', 'Somewhat easy', 'Moderate', 'Somewhat difficult','Difficult','Very difficult'],
        ['Students', 32, 23, 90, 72, 127, 12, 7]
    ]);

    const options = {
        isStacked: 'percent',
        legend: { position: 'none' },
        hAxis: {
        textPosition: 'none'
        },
        vAxis: {
        textPosition: 'none',
        gridlines: { color: 'transparent' }
        },
        chartArea: { width: '100%', height: '40' },
        colors: ['#6ce5e8', '#41b8d5', '#2d8bba', '#506e9a', '#635a92', '#7e468a', '#942270'],
        bar: { groupWidth: '100%' }
    };

    const chart = new google.visualization.BarChart(document.getElementById("chart4_div"));
    chart.draw(data, options);
}

function enrollment() {
    var data = google.visualization.arrayToDataTable([
        ['Year', '1st sem', '2nd sem', 'Midyear'],
        ['2022', 1000, 1000, 1200],
        ['2023', 9500, 3500, 800],
        ['2024', 1800, 2500, 700],
        ['2025', 3200, 3000, 900],
    ]);

    var options = {
        title: '',
        curveType: 'none', // no smoothing
        legend: { position: 'none' }, // hide legend to match the image
        colors: ['#c3083d', '#e19109', '#059669'], // red, orange, green
        lineWidth: 3,
        pointSize: 5,
        chartArea: { top: 10, right: 10, bottom: 20, left: 0, width: '85%', height: '70%' },
        hAxis: {
        textStyle: { fontSize: 12 }
        },
        vAxis: {
        textStyle: { fontSize: 12 },
        minValue: 0
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart5_div'));
    chart.draw(data, options);
}

async function updateUnitProgress() {
    try {
        const studentCourseHistory = window.studentCourseHistory;
        //const studentCourseHistory = await fetchJSON('../student/data/student-course-history.json');
        const coursesData = await fetchJSON('../student/data/courses.json');

        if (!studentCourseHistory || !coursesData) {
            console.error("Error: Missing required data.");
            return;
        }

        console.log("Loaded studentCourseHistory:", studentCourseHistory);
        console.log("Loaded coursesData:", coursesData);

        // Convert courses into a map for easy lookup
        const allCourses = Object.values(coursesData).flat();
        const courseMap = new Map(allCourses.map(c => [c.code, parseFloat(c.units)])); // Ensure units are numbers

        let completedUnits = 0;
        let inProgressUnits = 0;
        const totalUnitsRequired = 160;

        // Retrieve coursePlan from localStorage
        let coursePlan = JSON.parse(localStorage.getItem('coursePlan')) || [];

        // Sum up the units from coursePlan for in-progress courses
        inProgressUnits = coursePlan.reduce((sum, course) => {
          return sum + (!isNaN(course.units) ? Number(course.units) : 0);
        }, 0);

        // Calculate completed units from studentCourseHistory
        studentCourseHistory.forEach(termData => {
            termData.courses.forEach(course => {
                const units = courseMap.get(course.code);
                if (!isNaN(units) && course.grade !== "DRP" && course.grade !== "U" && parseFloat(course.grade) !== 5) {
                    completedUnits += units; // Completed courses
                }
            });
        });
        
        const notStartedUnits = totalUnitsRequired - (completedUnits + inProgressUnits);

        // Calculate percentages
        const percentCompleted = ((completedUnits / totalUnitsRequired) * 100).toFixed(1);
        const percentInProgress = ((inProgressUnits / totalUnitsRequired) * 100).toFixed(1);
        const percentNotStarted = ((notStartedUnits / totalUnitsRequired) * 100).toFixed(1);

        let classification = "Freshman";
        if (percentCompleted > 75) {
            classification = percentCompleted === 100 ? "Graduating" : "Senior";
        } else if (percentCompleted > 50) {
            classification = "Junior";
        } else if (percentCompleted > 25) {
            classification = "Sophomore";
        }

        // Debugging
        console.log("Computed Units:", { completedUnits, inProgressUnits, notStartedUnits });
        console.log("Computed Percentages:", { percentCompleted, percentInProgress, percentNotStarted });

        // Ensure elements exist before updating
        if (document.getElementById("units-completed")) {
            document.getElementById("units-completed").textContent = 
                `${completedUnits} UNITS COMPLETED (${percentCompleted}%)`;
        }
        if (document.getElementById("units-in-progress")) {
            document.getElementById("units-in-progress").textContent = `${inProgressUnits} UNITS IN PROGRESS (${percentInProgress}%)`;
        }
        if (document.getElementById("units-not-started")) {
            document.getElementById("units-not-started").textContent = `${notStartedUnits} UNITS NOT STARTED (${percentNotStarted}%)`;
        }
        if (document.getElementById("percent-completed")) {
            document.getElementById("percent-completed").textContent = `${percentCompleted}%`;
        }
        if (document.getElementById("percent-completed1")) {
            document.getElementById("percent-completed1").textContent = `${percentCompleted}%`;
        }
        if (document.getElementById("percent-in-progress")) {
            document.getElementById("percent-in-progress").textContent = `${percentInProgress}%`;
        }
        if (document.getElementById("percent-not-started")) {
            document.getElementById("percent-not-started").textContent = `${percentNotStarted}%`;
        }
        if (document.getElementById("classification")) {
            document.getElementById("classification").textContent = classification;
        }

        // Update progress bar widths
        if (document.querySelector(".progress-fill")) {
            document.querySelector(".progress-fill").style.width = `${percentCompleted}%`;
        }
        if (document.querySelector(".progress-ongoing")) {
            document.querySelector(".progress-ongoing").style.width = `${percentInProgress}%`;
            document.querySelector('.progress-ongoing').style.left = `${percentCompleted}%`;
        }
        if (document.querySelector(".progress-remaining")) {
            document.querySelector(".progress-remaining").style.width = `${percentNotStarted}%`;
            document.querySelector('.progress-remaining').style.left = `${percentCompleted + percentInProgress}`;
        }

        console.log("Progress bar updated!");

        return completedUnits;

    } catch (error) {
        console.error("Error updating unit progress:", error);
    }
}

// Run when page loads
document.addEventListener("DOMContentLoaded", updateUnitProgress);


async function residency() {
  let residency = 0;
  const studentCourseHistory = window.studentCourseHistory;
  studentCourseHistory.forEach(term => {
    if (!term.term.includes("MIDYR") && term.courses.length > 0) {
      residency += 0.5
    }
  })

  const residencyDisplay = document.getElementById('residency');
  residencyDisplay.textContent = `${residency} years`

  return residency;
}

async function otherScorecards() {
    const studentCourseHistory = window.studentCourseHistory;
    const completedUnits = await updateUnitProgress(); 
    const residencyValue = await residency(); 
    let unitsLeft = 160 - completedUnits;
    let residencyLeft = 4 - residencyValue;

    // Check if IE 198 was taken
    let hasIE198 = false;
    studentCourseHistory.forEach(term => {
        term.courses.forEach(course => {
            if (course.code.includes("IE 198")) {
                hasIE198 = true;
            }
        });
    });

    if (!hasIE198) {
        unitsLeft -= 3;
    }

    // Compare residencyLeft with required semesters (21 units per sem, 2 sems per year)
    const requiredSemesters = unitsLeft / (21 * 2);

    const progressText = document.getElementById("progressByUnits");
    if (progressText) {
        progressText.textContent = (residencyLeft >= requiredSemesters) ? "On Time" : "Behind";
    }

    const cpStatus = checkCriticalCourses(residencyValue, studentCourseHistory);
    const cpText = document.getElementById("progressByCP");
    if (cpText) {
    cpText.textContent = cpStatus;
    }

    const projGradText = document.getElementById("projGrad");
    if (projGradText) {
    projGradText.textContent = getProjectedGraduation(studentCourseHistory, residencyValue);
    }
}

function checkCriticalCourses(residency, studentCourseHistory) {
  const requiredCoursesMap = {
    0.5: ["MATH 27", "IE 10", "PHYS 51", "CHEM 18"],
    1: ["MATH 28", "IE 31", "IE 21", "STAT 101"],
    1.5: ["IE 141", "IE 125", "IE 132"],
    2: ["IE 150", "IE 151"],
    2.5: ["IE 152"],
    3: ["IE 184", "IE 200"],
    3.5: ["IE 185", "IE 200"],
  };

  const allCriticalCourses = Object.values(requiredCoursesMap).flat();

  const takenCourses = new Set();
  studentCourseHistory.forEach(term => {
    term.courses.forEach(course => {
      if (course.grade !== "DRP" && course.grade !== "U" && parseFloat(course.grade) !== 5) {
        takenCourses.add(course.code.trim());
      }
    });
  });

  function isCourseCompleted(courseCode) {
    const courseArray = Array.from(takenCourses);

    // Special case: IE 200 can be any variant
    if (courseCode === "IE 200") {
      return courseArray.some(code => code.includes("IE 200"));
    }

    // Handle bypass logic
    //if (courseCode === "PHYS 51") {
    //  if (takenCourses.has("PHYS 51")) return true;
    //  return takenCourses.has("PHYS 71");
    //}

    // Standard case
    return takenCourses.has(courseCode);
  }

  if (residency > 4) {
    return "Behind";
  } else if (residency === 4) {
    const allCompleted = allCriticalCourses.every(isCourseCompleted);
    return allCompleted ? "On Time" : "Behind";
  } else {
    const requiredCourses = requiredCoursesMap[residency];
    if (!requiredCourses) return "N/A"; // For undefined residency levels like 0 or 0.25
    const allCompleted = requiredCourses.every(isCourseCompleted);
    return allCompleted ? "On Time" : "Behind";
  }
}

function getProjectedGraduation(studentCourseHistory, residencyValue) {
  const requiredCoursesMap = {
    0.5: ["MATH 27", "IE 10", "PHYS 51", "CHEM 18"],
    1: ["MATH 28", "IE 31", "IE 21", "STAT 101"],
    1.5: ["IE 141", "IE 125", "IE 132"],
    2: ["IE 150", "IE 151"],
    2.5: ["IE 152"],
    3: ["IE 184"],
    3.5: ["IE 185", "IE 200"],
    4: ["IE 200"]
  };

  // Extract taken courses
  const takenCourses = new Set();
  studentCourseHistory.forEach(term => {
    term.courses.forEach(course => {
      if (course.grade !== "DRP" && course.grade !== "U" && parseFloat(course.grade) !== 5) {
        takenCourses.add(course.code.trim());
      }
    });
  });

  // Check each tier for missing courses
  const tiers = Object.keys(requiredCoursesMap).map(parseFloat).sort((a, b) => a - b);
  let missingStartIndex = -1;

  function isCourseCompleted(courseCode) {
    const courseArray = Array.from(takenCourses);

    // Special case: IE 200 can be any variant
    if (courseCode === "IE 200") {
      return courseArray.some(code => code.includes("IE 200"));
    }

    // Handle bypass logic
    if (courseCode === "PHYS 51") {
      if (takenCourses.has("PHYS 51")) return true;
      return takenCourses.has("PHYS 71");
    }

    // Standard case
    return takenCourses.has(courseCode);
  }

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const requiredCourses = requiredCoursesMap[tier];
    const allCompleted = requiredCourses.every(isCourseCompleted);

    if (!allCompleted) {
      missingStartIndex = i;
      break;
    }
  }

  let additionalResidency = 0;
  if (missingStartIndex !== -1) {
    additionalResidency = (tiers.length - missingStartIndex) * 0.5;
  }

  console.log("add:", additionalResidency)
  // Find last residency term (e.g., AY 24-25 1ST SEM)
  const sortedTerms = studentCourseHistory
    .map(term => term.term)
    .filter(t => t.includes("AY"))
    .sort(); // this works because "AY 23-24 2ND SEM" < "AY 24-25 1ST SEM"

  const lastTerm = sortedTerms[sortedTerms.length - 1]; // e.g., "AY 24-25 1ST SEM"

  // Extract base AY
  const ayMatch = lastTerm.match(/AY (\d{2})-(\d{2}) (1ST SEM|2ND SEM|MIDYR)/);
  if (!ayMatch) return "Unknown AY";

  let startYear = parseInt(ayMatch[1]);
  let endYear = parseInt(ayMatch[2]);
  let sem = ayMatch[3]
  
  let semIndex = 0;

  if (sem === "1ST SEM") {
    semIndex = 0.5;
  }

  if (residencyValue >= 4) {
  additionalResidency -= 0.5;
  }

  // Process the additional residency in 0.5 steps
  let remaining = additionalResidency;
  while (remaining > 0) {
    if (semIndex === 0.5) {
      semIndex = 1.0; // move to 2ND SEM
    } else {
      // Move to next AY
      startYear += 1;
      endYear += 1;
      semIndex = 0.5; // reset to 1ST SEM
    }
    remaining -= 0.5;
  }

  const finalTerm = semIndex === 0.5 ? "1ST SEM" : "2ND SEM";
  const finalAY = `AY ${startYear}-${endYear}`;
  return `${finalAY} ${finalTerm}`;
}