// Static version of the GPA Calculator for GitHub Pages
// Uses PDF.js for client-side PDF processing

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const calculateBtn = document.getElementById('calculateBtn');
    const loading = document.getElementById('loading');
    const resultsSection = document.getElementById('resultsSection');
    const errorSection = document.getElementById('errorSection');
    const resetBtn = document.getElementById('resetBtn');
    const errorResetBtn = document.getElementById('errorResetBtn');
    
    // Results elements
    const gpa4Scale = document.getElementById('gpa4Scale');
    const gpaPercentage = document.getElementById('gpaPercentage');
    const totalCourses = document.getElementById('totalCourses');
    const totalCreditsEarned = document.getElementById('totalCreditsEarned');
    const totalCreditsForGPA = document.getElementById('totalCreditsForGPA');
    const failedCourses = document.getElementById('failedCourses');
    const coursesTableBody = document.getElementById('coursesTableBody');
    const errorMessage = document.getElementById('errorMessage');
    
    let selectedFile = null;
    let allCourses = []; // Store all courses data for filtering

    // Grade conversion system (same as Python version)
    const gradeToGPA = {
        // University 3-digit grade to 4.0 scale conversion
        90: 4.0, 91: 4.0, 92: 4.0, 93: 4.0, 94: 4.0, 95: 4.0, 96: 4.0, 97: 4.0, 98: 4.0, 99: 4.0, 100: 4.0,
        85: 4.0, 86: 4.0, 87: 4.0, 88: 4.0, 89: 4.0,
        80: 3.7, 81: 3.7, 82: 3.7, 83: 3.7, 84: 3.7,
        77: 3.3, 78: 3.3, 79: 3.3,
        73: 3.0, 74: 3.0, 75: 3.0, 76: 3.0,
        70: 2.7, 71: 2.7, 72: 2.7,
        67: 2.3, 68: 2.3, 69: 2.3,
        63: 2.0, 64: 2.0, 65: 2.0, 66: 2.0,
        60: 1.7, 61: 1.7, 62: 1.7,
        57: 1.3, 58: 1.3, 59: 1.3,
        53: 1.0, 54: 1.0, 55: 1.0, 56: 1.0,
        50: 0.7, 51: 0.7, 52: 0.7
    };

    // Default to 0.0 for grades below 50
    function convertGradeToGPA(grade) {
        if (grade >= 50) {
            return gradeToGPA[grade] || 0.0;
        }
        return 0.0;
    }
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
    
    // Upload button click handler
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Calculate button handler
    calculateBtn.addEventListener('click', processTranscript);
    
    // Reset button handlers
    resetBtn.addEventListener('click', resetForm);
    errorResetBtn.addEventListener('click', resetForm);
    
    // Filter button handlers
    document.addEventListener('click', function(e) {
        if (e.target.closest('.filter-btn')) {
            const filterBtn = e.target.closest('.filter-btn');
            const filterType = filterBtn.dataset.filter;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            
            // Apply filter
            applyGPAFilter(filterType);
        }
    });
    
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            validateAndDisplayFile(file);
        }
    }
    
    function handleDragOver(event) {
        event.preventDefault();
        uploadArea.classList.add('dragover');
    }
    
    function handleDragLeave(event) {
        event.preventDefault();
        uploadArea.classList.remove('dragover');
    }
    
    function handleDrop(event) {
        event.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            validateAndDisplayFile(file);
        }
    }
    
    function validateAndDisplayFile(file) {
        // Validate file type
        if (!file.type.includes('pdf')) {
            showError('Please select a PDF file.');
            return;
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showError('File size must be less than 10MB.');
            return;
        }
        
        selectedFile = file;
        
        // Update file info display
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // Show file info and hide upload area
        uploadArea.style.display = 'none';
        fileInfo.style.display = 'flex';
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async function processTranscript() {
        if (!selectedFile) {
            showError('No file selected.');
            return;
        }
        
        // Show loading state
        hideAllSections();
        loading.style.display = 'block';
        
        try {
            // Read PDF using PDF.js
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            let fullText = '';
            
            // Extract text from all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // PDF.js returns text items with positioning - we need to reconstruct lines
                let pageText = '';
                let currentY = null;
                let lineText = '';
                
                for (const item of textContent.items) {
                    // If this is a new line (different Y position), start a new line
                    if (currentY !== null && Math.abs(item.transform[5] - currentY) > 2) {
                        if (lineText.trim()) {
                            pageText += lineText.trim() + '\n';
                        }
                        lineText = '';
                    }
                    
                    lineText += item.str + ' ';
                    currentY = item.transform[5];
                }
                
                // Add the last line
                if (lineText.trim()) {
                    pageText += lineText.trim() + '\n';
                }
                
                fullText += pageText;
            }
            
            console.log('Extracted text preview:', fullText.substring(0, 1000) + '...');
            console.log('Full text length:', fullText.length);
            
            // Parse courses from text
            const courses = parseCourses(fullText);
            
            console.log('Parsed courses:', courses);
            
            if (courses.length === 0) {
                console.error('No courses found. Text preview:', fullText.substring(0, 2000));
                showError('No valid courses found in transcript. Please check the format or try a different PDF.');
                return;
            }
            
            // Calculate GPA
            const { gpa4_0, gpaPercentage: gpaPercent } = calculateGPA(courses);
            
            // Format courses for display
            const formattedCourses = courses.map(course => ({
                course_code: `${course.subject} ${course.course_number}`,
                description: course.description,
                credits_attempted: course.credits_attempted,
                credits_earned: course.credits_earned,
                credits_for_gpa: course.credits_for_gpa,
                grade_display: course.grade_display,
                gpa_points: course.gpa_points,
                term: course.term,
                is_failed: course.is_failed
            }));
            
            const results = {
                gpa_4_0: gpa4_0,
                gpa_percentage: gpaPercent,
                total_courses: courses.length,
                total_credits_attempted: courses.reduce((sum, c) => sum + c.credits_attempted, 0),
                total_credits_earned: courses.reduce((sum, c) => sum + c.credits_earned, 0),
                total_credits_for_gpa: courses.reduce((sum, c) => sum + c.credits_for_gpa, 0),
                failed_courses: courses.filter(c => c.is_failed).length,
                courses: formattedCourses
            };
            
            displayResults(results);
            
        } catch (error) {
            console.error('Processing error:', error);
            showError('Error processing PDF. Please ensure it contains readable text.');
        }
    }

    function parseCourses(text) {
        const courses = [];
        const lines = text.split('\n');
        
        let currentTerm = "";
        
        console.log(`Parsing transcript with ${lines.length} lines`);
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            
            // Check for term headers (e.g., "2022 Fall/Winter", "2023 Summer")
            if (/\d{4}\s+(Fall\/Winter|Summer|Fall|Winter|Spring)/.test(line)) {
                currentTerm = line;
                console.log(`Found term: ${currentTerm}`);
                continue;
            }
            
            // Skip program/plan information lines
            if (line.startsWith('Program:') || line.startsWith('Plan:') || 
                line.startsWith('Faculty of') || line.startsWith('Bachelor of') || 
                line.startsWith('Certificate') || line.startsWith('Major in') || 
                line.startsWith('Minor in')) {
                continue;
            }
            
            // Skip header lines
            if (line.includes('Course') && line.includes('Description') && line.includes('Attempted')) {
                continue;
            }
            
            // Parse course lines - be more flexible with spacing
            // Clean up extra spaces and normalize
            line = line.replace(/\s+/g, ' ').trim();
            const parts = line.split(' ');
            
            if (parts.length >= 6) {
                // Check if first part looks like a subject code
                if (parts[0].match(/^[A-Z]{3,10}$/)) {
                    try {
                        const subject = parts[0];
                        const courseNum = parts[1] || "";
                        
                        // The last 3 parts should be: attempted, earned, grade
                        if (parts.length >= 3) {
                            const attemptedStr = parts[parts.length - 3];
                            const earnedStr = parts[parts.length - 2];
                            const gradeStr = parts[parts.length - 1];
                            
                            // Validate and convert credits
                            const attempted = parseFloat(attemptedStr);
                            const earned = parseFloat(earnedStr);
                            
                            if (isNaN(attempted) || isNaN(earned)) continue;
                            
                            // Validate and convert grade
                            let gpaPoints = 0;
                            let gradeNumeric = null;
                            
                            if (/^\d{3}$/.test(gradeStr)) {
                                gradeNumeric = parseInt(gradeStr);
                                gpaPoints = convertGradeToGPA(gradeNumeric);
                            } else if (gradeStr === 'F') {
                                // Handle F grades explicitly
                                gpaPoints = 0.0;
                                gradeNumeric = null;
                            } else {
                                continue;
                            }
                            
                            // Extract description
                            const descParts = parts.slice(2, -3);
                            const description = descParts.join(" ");
                            
                            // Skip courses with no attempted credits (future courses only)
                            if (attempted <= 0) {
                                console.log(`Skipping course ${subject} ${courseNum} - no attempted credits (future course)`);
                                continue;
                            }
                            
                            // Determine credits for GPA calculation and failed status
                            let creditsForGpa;
                            let isFailed = false;
                            
                            // Include failed courses: attempted > 0 but earned = 0
                            if (earned <= 0 && attempted > 0) {
                                console.log(`Including failed course ${subject} ${courseNum} - attempted: ${attempted}, earned: ${earned}`);
                                creditsForGpa = attempted; // Use attempted credits for failed courses
                                isFailed = true;
                                // Ensure failed courses have 0 GPA points
                                gpaPoints = 0.0;
                            } else {
                                creditsForGpa = earned; // Use earned credits for passed courses
                            }
                            
                            const courseData = {
                                subject: subject,
                                course_number: courseNum,
                                description: description,
                                credits_attempted: attempted,
                                credits_earned: earned,
                                credits_for_gpa: creditsForGpa,
                                grade_numeric: gradeNumeric,
                                grade_display: gradeStr,
                                gpa_points: gpaPoints,
                                term: currentTerm,
                                is_failed: isFailed
                            };
                            
                            courses.push(courseData);
                            console.log(`Added course: ${subject} ${courseNum} - ${earned} credits - ${gpaPoints} GPA points`);
                        }
                    } catch (error) {
                        console.log(`Error parsing line '${line}': ${error}`);
                        continue;
                    }
                }
            }
        }
        
        console.log(`Successfully parsed ${courses.length} courses`);
        return courses;
    }

    function calculateGPA(courses) {
        if (!courses || courses.length === 0) {
            return { gpa4_0: 0, gpaPercentage: 0 };
        }
        
        const totalCredits = courses.reduce((sum, course) => sum + course.credits_for_gpa, 0);
        const totalPoints = courses.reduce((sum, course) => sum + (course.credits_for_gpa * course.gpa_points), 0);
        
        // Calculate percentage based on actual numeric grades, not GPA scale
        const totalPercentagePoints = courses.reduce((sum, course) => {
            const numericGrade = course.grade_numeric || 0; // Use actual grade (050, 080, etc.)
            return sum + (course.credits_for_gpa * numericGrade);
        }, 0);
        
        if (totalCredits === 0) {
            return { gpa4_0: 0, gpaPercentage: 0 };
        }
        
        const gpa4_0 = totalPoints / totalCredits;
        const gpaPercentage = totalPercentagePoints / totalCredits; // Average of actual grades
        
        return { 
            gpa4_0: Math.round(gpa4_0 * 100) / 100, 
            gpaPercentage: Math.round(gpaPercentage * 10) / 10 
        };
    }
    
    function displayResults(data) {
        // Store all courses data for filtering
        allCourses = data.courses;
        
        // Hide loading and show results
        hideAllSections();
        resultsSection.style.display = 'block';
        
        // Update GPA display (initial view - all courses)
        updateGPADisplay(data.gpa_4_0, data.gpa_percentage, 'All Courses');
        
        // Update summary stats
        totalCourses.textContent = data.total_courses;
        totalCreditsEarned.textContent = data.total_credits_earned.toFixed(1);
        totalCreditsForGPA.textContent = data.total_credits_for_gpa.toFixed(1);
        failedCourses.textContent = data.failed_courses;
        
        // Update courses table
        updateCoursesTable(data.courses);
        
        // Animate the results
        setTimeout(() => {
            resultsSection.style.opacity = '0';
            resultsSection.style.transform = 'translateY(20px)';
            resultsSection.style.transition = 'all 0.5s ease';
            resultsSection.style.opacity = '1';
            resultsSection.style.transform = 'translateY(0)';
        }, 100);
    }
    
    function updateCoursesTable(courses) {
        // Clear existing table content
        coursesTableBody.innerHTML = '';
        
        // Add courses to table
        courses.forEach(course => {
            const row = document.createElement('tr');
            
            // Add failed course styling
            if (course.is_failed) {
                row.classList.add('failed-course');
            }
            
            const statusText = course.is_failed ? 
                '<span class="failed-status">FAILED</span>' : 
                '<span class="passed-status">PASSED</span>';
            
            row.innerHTML = `
                <td><strong>${course.course_code}</strong></td>
                <td>${course.description}</td>
                <td>${course.credits_attempted.toFixed(2)}</td>
                <td>${course.credits_earned.toFixed(2)}</td>
                <td>${course.grade_display}</td>
                <td>${course.gpa_points.toFixed(2)}</td>
                <td>${statusText}</td>
            `;
            coursesTableBody.appendChild(row);
        });
    }
    
    function updateGPADisplay(gpa4_0, gpaPercent, description) {
        gpa4Scale.textContent = gpa4_0.toFixed(2);
        gpaPercentage.textContent = gpaPercent.toFixed(1) + '%';
        
        // Update descriptions
        const gpaDescription = document.getElementById('gpaDescription');
        const gpaDescriptionPercent = document.getElementById('gpaDescriptionPercent');
        if (gpaDescription) gpaDescription.textContent = description;
        if (gpaDescriptionPercent) gpaDescriptionPercent.textContent = description;
    }
    
    function applyGPAFilter(filterType) {
        if (!allCourses || allCourses.length === 0) return;
        
        let filteredCourses = [];
        let description = '';
        
        switch (filterType) {
            case 'all':
                filteredCourses = allCourses;
                description = 'All Courses';
                break;
                
            case 'last-2-years':
                filteredCourses = allCourses.filter(course => {
                    const term = course.term || '';
                    return term.includes('2024') || term.includes('2023');
                });
                description = 'Last 2 Years';
                break;
                
            case 'last-year':
                filteredCourses = allCourses.filter(course => {
                    const term = course.term || '';
                    return term.includes('2024');
                });
                description = 'Last Year (2024)';
                break;
                
            case 'best-12':
                const sortedCourses = [...allCourses].sort((a, b) => b.gpa_points - a.gpa_points);
                let totalCredits = 0;
                filteredCourses = [];
                
                for (const course of sortedCourses) {
                    if (totalCredits + course.credits_for_gpa <= 12) {
                        filteredCourses.push(course);
                        totalCredits += course.credits_for_gpa;
                    }
                    if (totalCredits >= 12) break;
                }
                description = `Best ${totalCredits.toFixed(1)} Credits`;
                break;
        }
        
        // Calculate GPA for filtered courses
        const { gpa4_0, gpaPercentage: gpaPercent } = calculateFilteredGPA(filteredCourses);
        
        // Update display
        updateGPADisplay(gpa4_0, gpaPercent, description);
        updateCoursesTable(filteredCourses);
        
        // Update summary stats for filtered data
        const filteredStats = calculateFilteredStats(filteredCourses);
        totalCourses.textContent = filteredStats.totalCourses;
        totalCreditsEarned.textContent = filteredStats.totalCreditsEarned.toFixed(1);
        totalCreditsForGPA.textContent = filteredStats.totalCreditsForGPA.toFixed(1);
        failedCourses.textContent = filteredStats.failedCourses;
    }
    
    function calculateFilteredGPA(courses) {
        if (!courses || courses.length === 0) {
            return { gpa4_0: 0, gpaPercentage: 0 };
        }
        
        const totalCredits = courses.reduce((sum, course) => sum + course.credits_for_gpa, 0);
        const totalPoints = courses.reduce((sum, course) => sum + (course.credits_for_gpa * course.gpa_points), 0);
        
        // Calculate percentage based on actual numeric grades
        const totalPercentagePoints = courses.reduce((sum, course) => {
            const numericGrade = course.grade_numeric || 0;
            return sum + (course.credits_for_gpa * numericGrade);
        }, 0);
        
        if (totalCredits === 0) {
            return { gpa4_0: 0, gpaPercentage: 0 };
        }
        
        const gpa4_0 = totalPoints / totalCredits;
        const gpaPercentage = totalPercentagePoints / totalCredits;
        
        return { gpa4_0, gpaPercentage };
    }
    
    function calculateFilteredStats(courses) {
        return {
            totalCourses: courses.length,
            totalCreditsEarned: courses.reduce((sum, course) => sum + course.credits_earned, 0),
            totalCreditsForGPA: courses.reduce((sum, course) => sum + course.credits_for_gpa, 0),
            failedCourses: courses.filter(course => course.is_failed).length
        };
    }
    
    function showError(message) {
        hideAllSections();
        errorSection.style.display = 'block';
        errorMessage.textContent = message;
    }
    
    function hideAllSections() {
        loading.style.display = 'none';
        resultsSection.style.display = 'none';
        errorSection.style.display = 'none';
    }
    
    function resetForm() {
        // Reset file selection
        selectedFile = null;
        fileInput.value = '';
        
        // Reset UI state
        uploadArea.style.display = 'block';
        fileInfo.style.display = 'none';
        hideAllSections();
        
        // Clear file info
        fileName.textContent = '';
        fileSize.textContent = '';
        
        // Clear results
        gpa4Scale.textContent = '0.00';
        gpaPercentage.textContent = '0.0%';
        totalCourses.textContent = '0';
        totalCreditsEarned.textContent = '0';
        totalCreditsForGPA.textContent = '0';
        failedCourses.textContent = '0';
        coursesTableBody.innerHTML = '';
        
        // Reset filter to "All Courses"
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
    }
});
