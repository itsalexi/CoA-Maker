import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import SignatureCanvas from 'react-signature-canvas';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import './App.css';
import debounce from 'lodash/debounce';

const PDF_TEMPLATE_URL = '/certificate_template.pdf';

GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

const positions = {
    title: { x: 151, y: 219 },
    submissionType: {
        program: { x: 156, y: 243 },
        project: { x: 252, y: 243 },
        report: { x: 358, y: 243 },
        paper: { x: 463, y: 243 },
        other: { x: 156, y: 265 },
        otherTextbox: { x: 247, y: 264 },
    },
    date: { x: 151, y: 286 },
    sources: { x: 39, y: 403 },
    aiTool: { x: 102, y: 578 },
    aiPurpose: { x: 101, y: 603 },
    studentName: { x: 160, y: 680 },
    courseCode: { x: 160, y: 705 },
    courseTitle: { x: 160, y: 727 },
    instructor: { x: 160, y: 749 },
    signature: { x: 160, y: 750 },
};

const CertificateOfAuthorship = () => {
    const [formData, setFormData] = useState({
        title: 'Sample Submission',
        submissionType: 'Program',
        otherType: '',
        date: '',
        sources: '',
        aiTool: '',
        aiPurpose: '',
        studentName: '',
        courseCode: '',
        courseTitle: '',
        instructor: '',
    });
    const [signature, setSignature] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showStudentDataModal, setShowStudentDataModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const signatureRef = useRef();
    const canvasRef = useRef();

    useEffect(() => {
        const savedData = localStorage.getItem('certificateData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            setFormData((prevData) => ({
                ...prevData,
                ...parsedData,
                title: 'Sample Submission',
                submissionType: 'Program',
            }));
        }
        const savedSignature = localStorage.getItem('signature');
        if (savedSignature) {
            setSignature(savedSignature);
        }
        loadStudentData();
        const currentDate = new Date().toISOString().split('T')[0];
        setFormData((prevData) => ({
            ...prevData,
            date: currentDate,
        }));
    }, []);

    useEffect(() => {
        localStorage.setItem('certificateData', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        if (signature) {
            localStorage.setItem('signature', signature);
        }
    }, [signature]);

    const loadStudentData = () => {
        const studentData = localStorage.getItem('studentData');
        if (studentData) {
            const parsedData = JSON.parse(studentData);
            setFormData((prevData) => ({
                ...prevData,
                studentName: parsedData.studentName || '',
                courseCode: parsedData.courseCode || '',
                courseTitle: parsedData.courseTitle || '',
                instructor: parsedData.instructor || '',
            }));
        }
    };

    const saveStudentData = () => {
        const studentData = {
            studentName: formData.studentName,
            courseCode: formData.courseCode,
            courseTitle: formData.courseTitle,
            instructor: formData.instructor,
        };
        localStorage.setItem('studentData', JSON.stringify(studentData));
        setShowStudentDataModal(false);
    };

    const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
        const lines = text.split('\n');
        let currentY = y;

        lines.forEach((line) => {
            const words = line.split(' ');
            let currentLine = '';

            for (let n = 0; n < words.length; n++) {
                const testLine = currentLine + words[n] + ' ';
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(currentLine, x, currentY);
                    currentLine = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    currentLine = testLine;
                }
            }
            context.fillText(currentLine, x, currentY);
            currentY += lineHeight;
        });
    };

    const updatePreview = useCallback(async () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (canvas.renderTask) {
            canvas.renderTask.cancel();
        }

        try {
            const pdf = await getDocument(PDF_TEMPLATE_URL).promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 1 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            canvas.renderTask = page.render({ canvasContext: ctx, viewport });
            await canvas.renderTask.promise;

            ctx.font = '12px Arial';
            ctx.fillStyle = 'black';

            ctx.fillText(formData.title, positions.title.x, positions.title.y);
            ctx.fillText(formData.date, positions.date.x, positions.date.y);
            wrapText(
                ctx,
                formData.sources,
                positions.sources.x,
                positions.sources.y,
                500,
                20
            );
            ctx.fillText(
                formData.aiTool,
                positions.aiTool.x,
                positions.aiTool.y
            );
            ctx.fillText(
                formData.aiPurpose,
                positions.aiPurpose.x,
                positions.aiPurpose.y
            );
            ctx.fillText(
                formData.studentName,
                positions.studentName.x,
                positions.studentName.y
            );
            ctx.fillText(
                formData.courseCode,
                positions.courseCode.x,
                positions.courseCode.y
            );
            ctx.fillText(
                formData.courseTitle,
                positions.courseTitle.x,
                positions.courseTitle.y
            );
            ctx.fillText(
                formData.instructor,
                positions.instructor.x,
                positions.instructor.y
            );

            const submissionTypes = [
                'program',
                'project',
                'report',
                'paper',
                'other',
            ];
            submissionTypes.forEach((type) => {
                const pos = positions.submissionType[type];
                ctx.beginPath();
                ctx.rect(pos.x - 5, pos.y - 10, 10, 10);
                if (formData.submissionType.toLowerCase() === type) {
                    ctx.fillStyle = 'black';
                    ctx.fill();
                }
                ctx.strokeStyle = 'black';
                ctx.stroke();
                ctx.fillStyle = 'black';
            });

            if (formData.submissionType.toLowerCase() === 'other') {
                ctx.fillText(
                    formData.otherType,
                    positions.submissionType.otherTextbox.x,
                    positions.submissionType.otherTextbox.y
                );
            }

            if (signature) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(
                        img,
                        positions.signature.x,
                        positions.signature.y,
                        100,
                        50
                    );
                    setPreviewUrl(canvas.toDataURL());
                };
                img.src = signature;
            } else {
                setPreviewUrl(canvas.toDataURL());
            }
        } catch (error) {
            console.error('Error updating preview:', error);
        } finally {
            delete canvas.renderTask;
        }
    }, [formData, signature]);

    const debouncedUpdatePreview = useCallback(
        debounce(() => {
            updatePreview();
        }, 300),
        [updatePreview]
    );

    useEffect(() => {
        debouncedUpdatePreview();
        return () => {
            debouncedUpdatePreview.cancel();
        };
    }, [formData, signature, debouncedUpdatePreview]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSignatureEnd = () => {
        setSignature(signatureRef.current.toDataURL());
    };

    const clearSignature = () => {
        signatureRef.current.clear();
        setSignature(null);
    };

    const generatePDF = async () => {
        try {
            const pdf = await getDocument(PDF_TEMPLATE_URL).promise;
            const page = await pdf.getPage(1);

            const scale = 2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;

            context.font = `${12 * scale}px Arial`;
            context.fillStyle = 'black';

            Object.entries(formData).forEach(([key, value]) => {
                if (positions[key]) {
                    if (key === 'sources') {
                        wrapText(
                            context,
                            value,
                            positions[key].x * scale,
                            positions[key].y * scale,
                            500 * scale,
                            20 * scale
                        );
                    } else {
                        context.fillText(
                            value,
                            positions[key].x * scale,
                            positions[key].y * scale
                        );
                    }
                }
            });

            const submissionTypes = [
                'program',
                'project',
                'report',
                'paper',
                'other',
            ];
            submissionTypes.forEach((type) => {
                const pos = positions.submissionType[type];
                context.beginPath();
                context.rect(
                    (pos.x - 5) * scale,
                    (pos.y - 10) * scale,
                    10 * scale,
                    10 * scale
                );
                if (formData.submissionType.toLowerCase() === type) {
                    context.fillStyle = 'black';
                    context.fill();
                }
                context.strokeStyle = 'black';
                context.stroke();
                context.fillStyle = 'black';
            });

            if (signature) {
                const img = new Image();
                img.onload = () => {
                    const signaturePos = positions.signature;
                    context.drawImage(
                        img,
                        signaturePos.x * scale,
                        signaturePos.y * scale,
                        100 * scale,
                        50 * scale
                    );

                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'pt',
                        format: [viewport.width, viewport.height],
                    });

                    pdf.addImage(
                        imgData,
                        'JPEG',
                        0,
                        0,
                        viewport.width,
                        viewport.height
                    );
                    pdf.save('certificate_of_authorship.pdf');
                };
                img.src = signature;
            } else {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'pt',
                    format: [viewport.width, viewport.height],
                });

                pdf.addImage(
                    imgData,
                    'JPEG',
                    0,
                    0,
                    viewport.width,
                    viewport.height
                );
                pdf.save('certificate_of_authorship.pdf');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(
                'An error occurred while generating the PDF. Please try again.'
            );
        }
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePosition({ x: Math.round(x), y: Math.round(y) });
    };

    return (
        <div className="certificate-container">
            <h1 className="certificate-title">Certificate of Authorship</h1>
            <div className="content-wrapper">
                <div className="form-section">
                    <h2 className="section-title">Form Details</h2>

                    <div className="form-group">
                        <div className="form-group-title">
                            Submission Details
                        </div>
                        <div className="form-row">
                            <div className="form-column">
                                <label htmlFor="title" className="form-label">
                                    Title of Submission
                                </label>
                                <input
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter title"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-column">
                                <label
                                    htmlFor="submissionType"
                                    className="form-label"
                                >
                                    Submission Type
                                </label>
                                <select
                                    id="submissionType"
                                    name="submissionType"
                                    value={formData.submissionType}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >
                                    <option value="Program">Program</option>
                                    <option value="Project">Project</option>
                                    <option value="Report">Report</option>
                                    <option value="Paper">Paper</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        {formData.submissionType === 'Other' && (
                            <div className="form-row">
                                <div className="form-column">
                                    <label
                                        htmlFor="otherType"
                                        className="form-label"
                                    >
                                        Specify Other Type
                                    </label>
                                    <input
                                        id="otherType"
                                        name="otherType"
                                        value={formData.otherType}
                                        onChange={handleInputChange}
                                        placeholder="Specify other type"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="form-row">
                            <div className="form-column">
                                <label htmlFor="date" className="form-label">
                                    Date of Submission
                                </label>
                                <input
                                    id="date"
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="form-group-title">
                            Sources and AI Usage
                        </div>
                        <div className="form-row">
                            <div className="form-column">
                                <label htmlFor="sources" className="form-label">
                                    Sources
                                </label>
                                <textarea
                                    id="sources"
                                    name="sources"
                                    value={formData.sources}
                                    onChange={handleInputChange}
                                    placeholder="Enter sources"
                                    className="form-textarea"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-column">
                                <label htmlFor="aiTool" className="form-label">
                                    AI Tool Used
                                </label>
                                <input
                                    id="aiTool"
                                    name="aiTool"
                                    value={formData.aiTool}
                                    onChange={handleInputChange}
                                    placeholder="Enter AI tool used"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-column">
                                <label
                                    htmlFor="aiPurpose"
                                    className="form-label"
                                >
                                    AI Purpose
                                </label>
                                <input
                                    id="aiPurpose"
                                    name="aiPurpose"
                                    value={formData.aiPurpose}
                                    onChange={handleInputChange}
                                    placeholder="Enter AI purpose"
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="form-group-title">
                            Student and Course Information
                        </div>
                        <div className="form-row">
                            <div className="form-column">
                                <label
                                    htmlFor="studentName"
                                    className="form-label"
                                >
                                    Student Name
                                </label>
                                <input
                                    id="studentName"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleInputChange}
                                    placeholder="Enter student name"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-column">
                                <label
                                    htmlFor="courseCode"
                                    className="form-label"
                                >
                                    Course Code
                                </label>
                                <input
                                    id="courseCode"
                                    name="courseCode"
                                    value={formData.courseCode}
                                    onChange={handleInputChange}
                                    placeholder="Enter course code"
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-column">
                                <label
                                    htmlFor="courseTitle"
                                    className="form-label"
                                >
                                    Course Title
                                </label>
                                <input
                                    id="courseTitle"
                                    name="courseTitle"
                                    value={formData.courseTitle}
                                    onChange={handleInputChange}
                                    placeholder="Enter course title"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-column">
                                <label
                                    htmlFor="instructor"
                                    className="form-label"
                                >
                                    Instructor
                                </label>
                                <input
                                    id="instructor"
                                    name="instructor"
                                    value={formData.instructor}
                                    onChange={handleInputChange}
                                    placeholder="Enter instructor name"
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="button-group">
                        <button
                            onClick={() => setShowSignatureModal(true)}
                            className="btn btn-primary"
                        >
                            Add Signature
                        </button>
                        <button
                            onClick={generatePDF}
                            className="btn btn-success"
                        >
                            Generate PDF
                        </button>
                        <button
                            onClick={() => setShowStudentDataModal(true)}
                            className="btn btn-danger"
                        >
                            Save Student Data
                        </button>
                    </div>
                </div>
                <div className="preview-section">
                    <h2 className="section-title">Preview</h2>
                    <div style={{ position: 'relative' }}>
                        <canvas
                            ref={canvasRef}
                            className="preview-canvas"
                            onMouseMove={handleMouseMove}
                        />
                        <div className="coordinate-display">
                            X: {mousePosition.x}, Y: {mousePosition.y}
                        </div>
                    </div>
                </div>
            </div>
            {showSignatureModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">Add Your Signature</h3>
                        <div className="signature-container">
                            <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                    width: 500,
                                    height: 200,
                                    className: 'signature-canvas',
                                }}
                                onEnd={handleSignatureEnd}
                            />
                        </div>
                        <p>Your signature will appear here on the form:</p>
                        <div className="signature-preview">Signature</div>
                        <button
                            onClick={clearSignature}
                            className="btn btn-danger"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setShowSignatureModal(false)}
                            className="btn btn-primary"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
            {showStudentDataModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">Save Student Data</h3>
                        <p>
                            This will save your student information for future
                            use.
                        </p>
                        <button
                            onClick={saveStudentData}
                            className="btn btn-success"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => setShowStudentDataModal(false)}
                            className="btn btn-danger"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            <footer
                style={{
                    textAlign: 'center',
                    padding: '20px',
                    marginTop: '40px',
                    borderTop: '1px solid #e0e0e0',
                }}
            >
                Made by{' '}
                <a
                    href="https://alexi.life"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Alexi
                </a>{' '}
                💙
            </footer>
        </div>
    );
};

export default CertificateOfAuthorship;
