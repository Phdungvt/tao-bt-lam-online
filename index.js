

import { GoogleGenAI, Type } from "@google/genai";

// --- State Management ---
let quizData = [];
let requestBatch = [];
let knowledgeBase = "";
let currentEditingIndex = -1;
let userApiKey = "";
let googleScriptUrl = "";
let teacherName = "";
let currentSubject = "";
let workingExamData = {}; // This will hold the data for the currently selected subject
let dataHasChanged = false; // Flag to track if the subject data has been modified
const PLACEHOLDER_IMG = "https://placehold.co/200x100/e2e8f0/cbd5e0?text=Ch%C6%B0a+c%C3%B3+%E1%BA%A3nh";
let ai = null;


// --- DOM Elements ---
const apiKeyInput = document.getElementById('api-key-input');
const googleScriptUrlInput = document.getElementById('google-script-url-input');
const teacherNameInput = document.getElementById('teacher-name-input');
const saveConfigBtn = document.getElementById('save-config-btn');

// Workflow elements
const cardWorkflowChoice = document.getElementById('card-workflow-choice');
const btnWorkflowAi = document.getElementById('btn-workflow-ai');
const btnWorkflowFile = document.getElementById('btn-workflow-file');
const workflowAiSteps = document.getElementById('workflow-ai-steps');
const workflowFileSteps = document.getElementById('workflow-file-steps');
document.querySelectorAll('.back-to-workflow-choice-btn').forEach(btn => {
    btn.addEventListener('click', resetToWorkflowChoice);
});

// AI Workflow elements
const subjectSelect = document.getElementById('subject-select');
const subjectDependentSteps = document.getElementById('subject-dependent-steps');
const gradeSelect = document.getElementById('grade-select');
const chapterSelect = document.getElementById('chapter-select');
const topicSelect = document.getElementById('topic-select');
const topicPreviewContainer = document.getElementById('topic-preview-container');
const topicObjectivesList = document.getElementById('topic-objectives-list');
const newObjectiveInput = document.getElementById('new-objective-input');
const addNewObjectiveBtn = document.getElementById('add-new-objective-btn');
const addObjectivesToPromptBtn = document.getElementById('add-objectives-to-prompt-btn');
const saveToLocalBtn = document.getElementById('save-to-local-btn');
const downloadJsonBtn = document.getElementById('download-json-btn');
const uploadJsonInput = document.getElementById('upload-json-input');
const revertSubjectDataBtn = document.getElementById('revert-subject-data-btn');
const dataStatusIndicator = document.getElementById('data-status-indicator');
const knowledgeFileInput = document.getElementById('knowledge-file-input');
const knowledgeFileLabel = document.getElementById('knowledge-file-label');
const uploadStatusAi = document.getElementById('upload-status-ai');
const generateButton = document.getElementById('generate-button');
const additionalPromptInput = document.getElementById('additional-prompt-input');
const questionTypeSelect = document.getElementById('question-type-select');
const questionCountInput = document.getElementById('question-count-input');
const difficultySelect = document.getElementById('difficulty-select');
const addRequestBtn = document.getElementById('add-request-btn');
const requestListContainer = document.getElementById('request-list-container');
const aiSuggestionBtn = document.getElementById('ai-suggestion-btn');
const aiSuggestionsContainer = document.getElementById('ai-suggestions-container');

// File Workflow elements
const analyzeFileInput = document.getElementById('analyze-file-input');
const analyzeFileLabel = document.getElementById('analyze-file-label');
const uploadStatusFile = document.getElementById('upload-status-file');

// Shared elements
const quizArea = document.getElementById('quiz-area');
const placeholder = document.getElementById('placeholder');
const globalLoader = document.getElementById('global-loader');
const sharedActionsContainer = document.getElementById('shared-actions-container');
const createNewExamBtn = document.getElementById('create-new-exam-btn');
const exportHtmlBtn = document.getElementById('export-html-btn');
const generateStudyGuideBtn = document.getElementById('generate-study-guide-btn');

// Result Tabs
const resultTabsContainer = document.getElementById('result-tabs-container');
const resultTabs = document.getElementById('result-tabs');
const tabContentExam = document.getElementById('tab-content-exam');
const tabContentMatrix = document.getElementById('tab-content-matrix');
const tabContentSpec = document.getElementById('tab-content-spec');
const quizContainer = document.getElementById('quiz-container');

// Modal elements
const editModal = document.getElementById('edit-modal');
const editQuestionText = document.getElementById('edit-question-text');
const editOptionsContainer = document.getElementById('edit-options-container');
const saveEditButton = document.getElementById('save-edit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const finalizeContainer = document.getElementById('finalize-container');
const finalizeEditsBtn = document.getElementById('finalize-edits-btn');
const dirtyCountSpan = document.getElementById('dirty-count');
const editQuestionImageContainer = document.getElementById('edit-question-image-container');
const editImageFileInput = document.getElementById('edit-image-file-input');
const editUploadImageBtn = document.getElementById('edit-upload-image-btn');
const editPasteImageBtn = document.getElementById('edit-paste-image-btn');
const editDeleteImageBtn = document.getElementById('edit-delete-image-btn');


// Export Modal
const exportOptionsModal = document.getElementById('export-options-modal');
const confirmExportBtn = document.getElementById('confirm-export-btn');
const cancelExportBtn = document.getElementById('cancel-export-btn');
const exportTitleInput = document.getElementById('export-title-input');
const exportTimeLimitInput = document.getElementById('export-time-limit-input');
const exportRetriesInput = document.getElementById('export-retries-input');
const exportShowAnswersCheck = document.getElementById('export-show-answers-check');
const exportShowExplanationCheck = document.getElementById('export-show-explanation-check');


// Study Guide Modal
const studyGuideModal = document.getElementById('study-guide-modal');
const studyGuideContent = document.getElementById('study-guide-content');
const studyGuideLoader = document.getElementById('study-guide-loader');
const closeStudyGuideBtn = document.getElementById('close-study-guide-btn');
const copyStudyGuideBtn = document.getElementById('copy-study-guide-btn');


// --- UI Update Functions ---
// A helper function to safely call MathJax to prevent errors if the library hasn't loaded
function safeTypeset(elements) {
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise(elements).catch(function (err) {
            console.error('MathJax typesetting error: ' + err.message);
        });
    } else {
        console.warn("MathJax is not ready for typesetting.");
    }
}

function setUploadStatus(element, message, isError = false) {
    element.innerHTML = `<span class="${isError ? 'text-red-600' : 'text-green-600'}">${message}</span>`;
}

function toggleUploadLoading(isLoading, labelElement, originalHTML) {
    if (isLoading) {
        labelElement.innerHTML = `<div class="small-loader"></div><span class="ml-2">Đang xử lý...</span>`;
        labelElement.classList.add('pointer-events-none', 'opacity-75');
    } else {
        labelElement.innerHTML = originalHTML;
        labelElement.classList.remove('pointer-events-none', 'opacity-75');
    }
}

// --- File Processing ---
async function extractTextFromImage(file) {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return "";
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const result = e.target?.result;
            if (typeof result !== 'string') {
                return reject(new Error("Could not read file as data URL."));
            }
            const base64Data = result.split(',')[1];
            if (!base64Data) {
                return reject(new Error("Could not read file for Base64 conversion."));
            }
            try {
                const imagePart = { inlineData: { mimeType: file.type, data: base64Data } };
                const textPart = { text: "Trích xuất toàn bộ văn bản từ hình ảnh này. Chỉ trả về nội dung văn bản thô." };
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [textPart, imagePart] },
                });
                resolve(response.text || "");
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

async function extractTextFromPdf(file) {
    if (!window.pdfjsLib) {
        throw new Error("Thư viện xử lý PDF (PDF.js) chưa được tải.");
    }
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
            try {
                const pdf = await window.pdfjsLib.getDocument({ data: e.target?.result }).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((s) => s.str).join(' ');
                }
                resolve(textContent);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}


async function extractTextFromDocx(file) {
    if (!window.mammoth) {
        throw new Error("Thư viện xử lý DOCX (Mammoth.js) chưa được tải.");
    }
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
            try {
                const result = await window.mammoth.extractRawText({ arrayBuffer: e.target?.result });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

async function handlePasteImage(previewElement) {
    try {
        const permission = await navigator.permissions.query({ name: 'clipboard-read' });
        if (permission.state === 'denied') {
            throw new Error('Quyền truy cập clipboard đã bị từ chối.');
        }

        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        previewElement.src = e.target.result;
                    }
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
        alert('Không tìm thấy hình ảnh trong clipboard.');
    } catch (error) {
        console.error('Lỗi khi dán ảnh:', error);
        alert('Không thể dán ảnh. Vui lòng kiểm tra quyền truy cập clipboard của trình duyệt và thử lại.');
    }
}


// --- Core Functions ---

function handleTabClick(event) {
    const clickedTab = event.target.closest('.tab-btn');
    if (!clickedTab) return;

    // Deactivate all tabs
    resultTabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'border-indigo-500');
        btn.classList.add('text-gray-500', 'border-transparent', 'hover:text-gray-700', 'hover:border-gray-300');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Activate clicked tab
    clickedTab.classList.add('text-indigo-600', 'border-indigo-500');
    clickedTab.classList.remove('text-gray-500', 'border-transparent', 'hover:text-gray-700', 'hover:border-gray-300');
    const tabName = clickedTab.dataset.tab;
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
}


function renderQuiz() {
    quizContainer.innerHTML = '';
    if (quizData.length === 0) {
        placeholder.classList.remove('hidden');
        quizArea.classList.add('hidden'); // Also hide the whole area
        return;
    }
    placeholder.classList.add('hidden');
    quizArea.classList.remove('hidden');


    const dirtyCount = quizData.filter(q => q.isDirty).length;
    if (dirtyCount > 0) {
        finalizeContainer.classList.remove('hidden');
        dirtyCountSpan.textContent = String(dirtyCount);
    } else {
        finalizeContainer.classList.add('hidden');
    }

    // Group questions by type
    const groupedQuestions = quizData.reduce((acc, q) => {
        const type = q.type || 'multiple-choice'; // Default to MC if type is missing
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(q);
        return acc;
    }, {});

    const groupInfo = {
        'multiple-choice': { title: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN', subtitle: 'Chọn đáp án đúng nhất trong các lựa chọn sau.' },
        'true-false': { title: 'PHẦN II. CÂU HỎI ĐÚNG - SAI', subtitle: 'Xác định tính đúng hoặc sai cho mỗi mệnh đề dưới đây.' },
        'short-answer': { title: 'PHẦN III. CÂU HỎI TRẢ LỜI NGẮN', subtitle: 'Điền đáp án ngắn gọn vào phần trả lời.' },
        'essay': { title: 'PHẦN IV. CÂU HỎI TỰ LUẬN', subtitle: 'Trình bày chi tiết bài giải của bạn.' }
    };

    let questionCounter = 0;
    const partOrder = ['multiple-choice', 'true-false', 'short-answer', 'essay'];

    partOrder.forEach(partType => {
        const questions = groupedQuestions[partType];
        if (!questions || questions.length === 0) return;

        const info = groupInfo[partType];
        const groupHeader = document.createElement('div');
        groupHeader.className = "group-header mb-6 pb-3 border-b-2 border-gray-300";
        groupHeader.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800">${info.title}</h2>
            ${info.subtitle ? `<p class="text-md text-gray-600 italic mt-1">${info.subtitle}</p>` : ''}
        `;
        quizContainer.appendChild(groupHeader);

        questions.forEach((item) => {
            const globalIndex = quizData.indexOf(item);
            questionCounter++;
            const questionEl = document.createElement('div');
            questionEl.className = 'question-card p-5 border border-gray-200 rounded-xl bg-white shadow-sm mb-6';
            questionEl.dataset.index = String(globalIndex);

            let headerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-grow pr-4">
                        <h3 class="font-bold text-lg mb-2 text-gray-800">Câu ${questionCounter}: ${item.isDirty ? '<span class="text-yellow-500 font-bold" title="Các thay đổi chưa được định dạng bởi AI">*</span>' : ''}</h3>
                    </div>
                    <div class="flex-shrink-0 flex items-center gap-x-2">
                        <button data-index="${globalIndex}" class="edit-btn px-3 py-1.5 bg-yellow-400 text-yellow-900 text-sm font-semibold rounded-md hover:bg-yellow-500 transition-colors">Sửa</button>
                        <button data-index="${globalIndex}" class="delete-btn px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600 transition-colors">Xóa</button>
                    </div>
                </div>`;

            let bodyHTML = '';
            const questionText = item.type === 'true-false' ? item.main_question : item.question;
            const formattedQuestionText = (questionText || '').replace(/\n/g, '<br>');
            bodyHTML += `<div class="question-content text-gray-700">${formattedQuestionText}</div>`;
            
            bodyHTML += `<div id="image-container-${globalIndex}" class="mt-3">
                ${item.questionImage ? `<img src="${item.questionImage}" class="mt-3 rounded-lg max-w-sm border" alt="Hình ảnh câu hỏi">` : ''}
            </div>`;

            switch (item.type) {
                case 'multiple-choice':
                    bodyHTML += `
                        <div class="options-grid mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${(item.options || []).map((opt, i) => {
                                const optionImageHTML = (item.optionsImage && item.optionsImage[i]) ? `<img src="${item.optionsImage[i]}" class="mt-2 w-32 h-auto rounded border" alt="Hình ảnh đáp án">` : '';
                                return `
                                <div class="flex items-center gap-x-2 p-3 border rounded-lg ${i === item.correctAnswerIndex ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}">
                                    <span class="font-bold flex-shrink-0">${String.fromCharCode(65 + i)}.</span>
                                    <div class="option-content flex-grow">${opt}${optionImageHTML}</div>
                                </div>`
                            }).join('')}
                        </div>`;
                    break;
                case 'true-false':
                    bodyHTML += `
                        <div class="space-y-2 mt-3">
                            ${(item.statements || []).map((s, i) => `
                                <div class="flex items-center p-3 border rounded-lg ${s.is_correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}">
                                    <span class="font-bold mr-3 flex-shrink-0">${String.fromCharCode(97 + i)})</span>
                                    <span class="flex-grow">${s.statement}</span>
                                    <span class="ml-4 font-bold text-sm ${s.is_correct ? 'text-green-700' : 'text-red-700'}">${s.is_correct ? 'ĐÚNG' : 'SAI'}</span>
                                </div>
                            `).join('')}
                        </div>`;
                    break;
                case 'short-answer':
                case 'essay': // Essay questions will also have an answer/solution field
                    bodyHTML += `
                        <div class="mt-3">
                            <button class="toggle-answer-btn text-sm text-blue-600 hover:underline">Hiện đáp án/gợi ý</button>
                            <div class="answer-content hidden mt-2 p-3 bg-gray-100 border rounded-lg">
                                <strong>Đáp án/Gợi ý:</strong> ${item.answer || 'Chưa có'}
                            </div>
                        </div>`;
                    break;
            }

            let actionsHTML = `
                <div class="mt-4 pt-4 border-t border-dashed flex items-center gap-x-3">
                    <button data-index="${globalIndex}" class="explain-btn flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-md hover:bg-blue-200 transition-colors">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ✨ Giải thích đáp án
                    </button>
                     <button data-index="${globalIndex}" class="vary-btn flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-semibold rounded-md hover:bg-purple-200 transition-colors">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L9 15M20 4l-5 5"></path></svg>
                        ✨ Tạo câu hỏi tương tự
                    </button>
                </div>
                <div class="explanation-container mt-3 p-4 bg-gray-100 rounded-lg hidden">
                    <div class="loader-container text-center py-4">
                        <div class="small-loader mx-auto"></div>
                        <p class="text-sm text-gray-500 mt-2">AI đang giải thích...</p>
                    </div>
                    <div class="explanation-content"></div>
                </div>`;

            questionEl.innerHTML = headerHTML + bodyHTML + actionsHTML;
            quizContainer.appendChild(questionEl);
        });
    });

    safeTypeset([quizContainer]);

    // Re-bind events
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
    document.querySelectorAll('.explain-btn').forEach(btn => btn.addEventListener('click', handleExplainClick));
    document.querySelectorAll('.vary-btn').forEach(btn => btn.addEventListener('click', handleVaryClick));
    document.querySelectorAll('.toggle-answer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target;
            const answerContent = target.nextElementSibling;
            answerContent.classList.toggle('hidden');
            target.textContent = answerContent.classList.contains('hidden') ? 'Hiện đáp án/gợi ý' : 'Ẩn đáp án/gợi ý';
        });
    });
}


const difficulties = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
const questionTypes = {
    'multiple-choice': 'TNKQ',
    'true-false': 'Đúng-Sai',
    'short-answer': 'Trả lời ngắn',
    'essay': 'Tự luận'
};

function renderMatrixTable() {
    tabContentMatrix.innerHTML = '';
    if (requestBatch.length === 0) return;

    const chapters = {};
    requestBatch.forEach(req => {
        if (!chapters[req.chapter]) {
            chapters[req.chapter] = [];
        }
        chapters[req.chapter].push(req);
    });

    const questionTypeKeys = Object.keys(questionTypes);
    const difficultyCount = difficulties.length;
    const typeCount = questionTypeKeys.length;

    let tableHTML = `
        <h2 class="text-xl font-bold text-gray-800 mb-4">MA TRẬN ĐỀ THI</h2>
        <table class="w-full">
            <thead>
                <tr>
                    <th rowspan="3">TT</th>
                    <th rowspan="3" class="text-left">Chương/Chủ đề</th>
                    <th rowspan="3" class="text-left">Nội dung/Đơn vị kiến thức</th>
                    <th colspan="${typeCount * difficultyCount}">Mức độ nhận thức</th>
                    <th rowspan="3">Tổng cộng</th>
                </tr>
                <tr>
                    ${questionTypeKeys.map(key => `<th colspan="${difficultyCount}">${questionTypes[key]}</th>`).join('')}
                </tr>
                <tr>
                    ${questionTypeKeys.map(() => difficulties.map(d => `<th>${d.split(' ')[0]}</th>`).join('')).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    let chapterIndex = 1;
    for (const chapterName in chapters) {
        const requestsInChapter = chapters[chapterName];
        requestsInChapter.forEach((req, reqIndex) => {
            tableHTML += `<tr>`;
            if (reqIndex === 0) {
                tableHTML += `<td rowspan="${requestsInChapter.length}">${chapterIndex}</td>`;
                tableHTML += `<td rowspan="${requestsInChapter.length}" class="text-left">${chapterName}</td>`;
            }
            tableHTML += `<td class="text-left">${req.topic}</td>`;
            
            let totalQuestionsInRequest = 0;
            questionTypeKeys.forEach(typeKey => {
                difficulties.forEach(diffKey => {
                    if (req.type === typeKey && req.difficulty === diffKey) {
                        tableHTML += `<td>${req.count}</td>`;
                        totalQuestionsInRequest += parseInt(req.count, 10);
                    } else {
                        tableHTML += `<td></td>`;
                    }
                });
            });
            
            tableHTML += `<td><b>${totalQuestionsInRequest}</b></td>`;
            tableHTML += `</tr>`;
        });
        chapterIndex++;
    }
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tabContentMatrix.innerHTML = tableHTML;
}

function renderSpecTable() {
    tabContentSpec.innerHTML = '';
    if (requestBatch.length === 0) return;

    const chapters = {};
    requestBatch.forEach(req => {
        if (!chapters[req.chapter]) {
            chapters[req.chapter] = [];
        }
        chapters[req.chapter].push(req);
    });

    const difficultyKeys = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
    const typeDisplayNames = { 
        'multiple-choice': 'TNKQ', 
        'true-false': 'Đúng/Sai',
        'short-answer': 'TL Ngắn',
        'essay': 'Tự Luận'
    };

    let tableHTML = `
        <h2 class="text-xl font-bold text-gray-800 mb-4">BẢN ĐẶC TẢ ĐỀ THI</h2>
        <table class="w-full">
            <thead>
                <tr>
                    <th rowspan="2">TT</th>
                    <th rowspan="2" class="text-left">Chương/Chủ đề</th>
                    <th rowspan="2" class="text-left">Nội dung/Đơn vị kiến thức</th>
                    <th rowspan="2" class="text-left">Yêu cầu cần đạt</th>
                    <th colspan="${difficultyKeys.length}">Số câu hỏi theo mức độ nhận thức</th>
                </tr>
                <tr>
                    ${difficultyKeys.map(d => `<th>${d}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    let chapterIndex = 1;
    for (const chapterName in chapters) {
        const requestsInChapter = chapters[chapterName];
        requestsInChapter.forEach((req, reqIndex) => {
            tableHTML += `<tr>`;
            if (reqIndex === 0) {
                tableHTML += `<td rowspan="${requestsInChapter.length}">${chapterIndex}</td>`;
                tableHTML += `<td rowspan="${requestsInChapter.length}" class="text-left">${chapterName}</td>`;
            }
            tableHTML += `<td class="text-left">${req.topic}</td>`;
            tableHTML += `<td class="text-left prose prose-sm max-w-sm">${req.additionalPrompt.replace(/\n/g, '<br>')}</td>`;
            
            difficultyKeys.forEach(diffKey => {
                if (req.difficulty === diffKey) {
                    const typeName = typeDisplayNames[req.type] || req.type;
                    tableHTML += `<td>${req.count}<br><i>(${typeName})</i></td>`;
                } else {
                    tableHTML += `<td></td>`;
                }
            });
            
            tableHTML += `</tr>`;
        });
        chapterIndex++;
    }
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tabContentSpec.innerHTML = tableHTML;
}

async function generateQuizFromBatch() {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return;
    }
    if (requestBatch.length === 0) {
        alert('Vui lòng thêm ít nhất một yêu cầu vào đề trước khi tạo.');
        return;
    }

    globalLoader.style.display = 'flex';
    generateButton.disabled = true;

    const generationPromises = requestBatch.map(async (request) => {
        const topicData = workingExamData[request.grade][request.topic];
        const typeTextMap = {
            'multiple-choice': 'Trắc nghiệm nhiều lựa chọn',
            'true-false': 'Đúng/Sai',
            'short-answer': 'Trả lời ngắn',
            'essay': 'Tự luận'
        };

        const subjectName = subjectSelect.options[subjectSelect.selectedIndex].text;
        let systemPrompt = `Bạn là một trợ lý AI chuyên gia, am hiểu sâu sắc về chương trình giáo dục phổ thông môn ${subjectName} tại Việt Nam. Nhiệm vụ của bạn là tạo ra câu hỏi thi dựa trên các thông tin chi tiết được cung cấp.

--- THÔNG TIN VỀ CHỦ ĐỀ ---
- Lớp/Khối: ${request.grade}
- Chương: ${request.chapter}
- Chủ đề/Chuyên đề: ${request.topic}
- Nội dung trọng tâm: ${topicData.content}
- Mục tiêu cần đạt: ${topicData.objectives.join('. ')}
- Dạng bài tập thường gặp: ${topicData.common_exercises.join('. ')}

--- YÊU CẦU CỤ THỂ ---
Hãy tạo ra chính xác ${request.count} câu hỏi thuộc loại "${typeTextMap[request.type]}" ở mức độ "${request.difficulty}".
${request.additionalPrompt ? `Yêu cầu bổ sung từ giáo viên: "${request.additionalPrompt}"` : ''}
${knowledgeBase ? `\n--- TÀI LIỆU THAM KHẢO BỔ SUNG DO GIÁO VIÊN CUNG CẤP ---\n${knowledgeBase}` : ''}
`;

        let schema;
        let finalPrompt;
        const commonRules = `QUY TẮC ĐỊNH DẠNG:
1. Tất cả các công thức toán học PHẢI được viết bằng mã LaTeX.
2. Nếu một câu hỏi yêu cầu hình vẽ, hãy chèn một placeholder văn bản với định dạng: [HÌNH VẼ: Mô tả chi tiết hình vẽ].
3. Khi tạo bảng biến thiên hoặc bất kỳ bảng nào khác, PHẢI sử dụng môi trường \`\\begin{array} ... \\end{array}\` của LaTeX. Ví dụ: \`$$\\begin{array}{c|ccccccc} x & -\\infty & & 0 & & 2 & & +\\infty \\\\ \\hline f'(x) & & + & 0 & - & 0 & + & \\\\ \\hline f(x) & & \\nearrow & f(0) & \\searrow & f(2) & \\nearrow & \\end{array}$$\``;


        switch (request.type) {
            case 'true-false':
                finalPrompt = `${systemPrompt}\n---\n${commonRules}\n3. Mỗi câu hỏi phải có một phát biểu chung và 4 mệnh đề con. Trả về một mảng JSON theo cấu trúc sau:\n[{"main_question": "...", "statements": [{"statement": "...", "is_correct": true/false}, ... ]}]`;
                schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            "main_question": { "type": Type.STRING },
                            "statements": {
                                "type": Type.ARRAY,
                                "items": {
                                    "type": Type.OBJECT,
                                    properties: {
                                        "statement": { "type": Type.STRING },
                                        "is_correct": { "type": Type.BOOLEAN }
                                    },
                                    required: ["statement", "is_correct"]
                                }
                            }
                        },
                        required: ["main_question", "statements"]
                    }
                };
                break;
            case 'short-answer':
                finalPrompt = `${systemPrompt}\n---\n${commonRules}\n3. Các câu hỏi này yêu cầu tính toán và điền một con số hoặc giá trị cụ thể. Trả về một mảng JSON theo cấu trúc sau:\n[{"question": "...", "answer": "..."}]`;
                schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            "question": { "type": Type.STRING },
                            "answer": { "type": Type.STRING }
                        },
                        required: ["question", "answer"]
                    }
                };
                break;
            case 'essay':
                finalPrompt = `${systemPrompt}\n---\n${commonRules}\n3. Các câu hỏi này là câu hỏi tự luận, yêu cầu giải thích hoặc chứng minh. Trả về một mảng JSON theo cấu trúc sau:\n[{"question": "...", "answer": "Gợi ý hoặc đáp án tóm tắt..."}]`;
                schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            "question": { "type": Type.STRING },
                            "answer": { "type": Type.STRING }
                        },
                        required: ["question", "answer"]
                    }
                };
                break;
            default: // multiple-choice
                finalPrompt = `${systemPrompt}\n---\n${commonRules}\n3. Trả về một mảng JSON có cấu trúc: [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0-3}].\n4. Quan trọng: Các chuỗi đáp án trong mảng 'options' không được chứa tiền tố như 'A.', 'B.', v.v...`;
                schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            "question": { "type": Type.STRING },
                            "options": { "type": Type.ARRAY, "items": { "type": Type.STRING } },
                            "correctAnswerIndex": { "type": Type.INTEGER }
                        },
                        required: ["question", "options", "correctAnswerIndex"]
                    }
                };
                break;
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: finalPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        return { text: response.text, requestType: request.type };
    });

    try {
        const results = await Promise.all(generationPromises);
        let combinedQuizData = [];
        results.forEach((result) => {
            if (result.text) {
                try {
                    let parsedData = JSON.parse(result.text);
                    if (!Array.isArray(parsedData)) { // Handle cases where AI returns a single object instead of an array
                         parsedData = [parsedData];
                    }
                    const typedData = parsedData.map((item) => ({ ...item, type: result.requestType, isDirty: false, explanation: null }));
                    combinedQuizData = combinedQuizData.concat(typedData);
                } catch (e) {
                    console.error(`Lỗi phân tích JSON:`, e, "Raw response:", result.text);
                }
            }
        });
        quizData = combinedQuizData;
        
        // Update UI
        workflowAiSteps.classList.add('hidden');
        quizArea.classList.remove('hidden');
        resultTabsContainer.classList.remove('hidden');

        renderQuiz();
        renderMatrixTable();
        renderSpecTable();

        // Reset for next time, but keep request batch for table rendering
        // requestBatch = [];
        // renderRequestBatch();
    } catch (error) {
        console.error("Lỗi khi tạo loạt câu hỏi:", error);
        alert("Đã xảy ra lỗi trong quá trình tạo câu hỏi. Vui lòng thử lại.");
    } finally {
        globalLoader.style.display = 'none';
        generateButton.disabled = false;
    }
}


async function formatTextWithLatex(text) {
    if (!ai) return text;
    if (!text || text.trim() === '') return text;
    const prompt = `Chuyển đổi văn bản sau để công thức toán học dùng chỉ inline LaTeX $...$ và display LaTeX $$...$$ (tuyệt đối không chèn newline trong công thức để không nhảy dòng). Chỉ trả về chuỗi đã định dạng. Văn bản: "${text}"`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    
    return response.text || text;
}

function handleFileSelect(event, previewElement) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    previewElement.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    }
}

function enableApp() {
    cardWorkflowChoice.classList.remove('disabled-card');
    const placeholderP = placeholder.querySelector('p');
    if (placeholderP) {
        placeholderP.textContent = 'Vui lòng chọn một phương thức để bắt đầu.';
    }
}

function renderRequestBatch() {
    requestListContainer.innerHTML = '';
    if (requestBatch.length === 0) {
        requestListContainer.innerHTML = `<p class="text-center text-gray-400 mt-4">Chưa có yêu cầu nào.</p>`;
        return;
    }
    
    const list = document.createElement('div');
    list.className = 'space-y-2';
    
    requestBatch.forEach((req, index) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md text-sm';
        const typeText = {
            'multiple-choice': 'Trắc nghiệm',
            'true-false': 'Đúng/Sai',
            'short-answer': 'Trả lời ngắn',
            'essay': 'Tự luận'
        }[req.type];
        
        item.innerHTML = `
            <div class="flex-grow">
                <p class="font-semibold">${req.count} câu ${typeText} (${req.difficulty})</p>
                <p class="text-xs text-gray-500 truncate" title="${req.topic}">${req.topic}</p>
            </div>
            <button data-index="${index}" class="remove-request-btn text-red-500 hover:text-red-700 ml-2 flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        list.appendChild(item);
    });
    
    requestListContainer.appendChild(list);
    document.querySelectorAll('.remove-request-btn').forEach(btn => btn.addEventListener('click', handleRemoveRequestClick));
}


function handleRemoveRequestClick(event) {
    const target = event.currentTarget;
    const index = parseInt(target.dataset.index, 10);
    requestBatch.splice(index, 1);
    renderRequestBatch();
}

function handleExportHTML(options, title) {
    if (quizData.length === 0) {
        alert("Chưa có câu hỏi nào để xuất file.");
        return;
    }
    if (!googleScriptUrl || !teacherName) {
        alert("Vui lòng nhập URL Web App và Tên giáo viên trong phần Cấu Hình Ban Đầu trước khi xuất file.");
        return;
    }

    const quizDataForExport = quizData.map(item => {
        const exportItem = {
            type: item.type,
            question: item.type === 'true-false' ? item.main_question : item.question,
            questionImage: item.questionImage || null,
            explanation: item.explanation || null,
        };
        if (item.type === 'multiple-choice') {
            exportItem.options = item.options;
            exportItem.optionsImage = item.optionsImage || [];
            exportItem.correctAnswerIndex = item.correctAnswerIndex;
        } else if (item.type === 'true-false') {
            exportItem.statements = item.statements.map(s => ({ statement: s.statement, is_correct: s.is_correct }));
        } else if (item.type === 'short-answer' || item.type === 'essay') {
            exportItem.answer = item.answer;
        }
        return exportItem;
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
        <script>
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                    displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
                },
                chtml: {
                    fontCache: 'global'
                }
            };
        <\/script>
        <script type="text/javascript" id="MathJax-script" async
            src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js">
        <\/script>
        <style>
            body { font-family: 'Be Vietnam Pro', sans-serif; background-color: #f0f4f8; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .question-card { 
                background-color: white; 
                border-radius: 1rem; 
                padding: 1.5rem 2rem; 
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                border-left: 5px solid transparent;
                transition: all 0.3s ease;
            }
            .ai-explanation { 
                background-color: #f0f9ff; 
                color: #0c4a6e;
                padding: 1rem; 
                border-radius: 0.75rem; 
                font-size: 0.9rem; 
                margin-top: 1rem; 
                border-left: 4px solid #38bdf8;
            }
            .feedback-icon { width: 1.5rem; height: 1.5rem; }
            .option-label {
                transition: all 0.2s ease-in-out;
                border: 2px solid #e5e7eb;
            }
            .option-label:hover {
                border-color: #6366f1;
                background-color: #eef2ff;
            }
            .option-label.correct { 
                border-color: #10b981 !important; 
                background-color: #ecfdf5 !important; 
                color: #065f46;
            }
            .option-label.incorrect { 
                border-color: #ef4444 !important; 
                background-color: #fef2f2 !important;
                color: #991b1b;
            }
            .statement-item.correct { background-color: #ecfdf5; border-color: #10b981; }
            .statement-item.incorrect { background-color: #fef2f2; border-color: #ef4444; }
            .tts-btn { transition: all 0.2s ease; }
            .tts-btn:hover { background-color: #e0e7ff; }
            .tts-btn.playing { color: #4f46e5; }
            .prose { max-width: 100%; }
            .prose h1, .prose h2, .prose h3 { font-weight: 600; }
            .prose p { margin-top: 0.5em; margin-bottom: 0.5em; }
            .prose ul, .prose ol { margin-top: 1em; margin-bottom: 1em; padding-left: 1.5em; }
            .prose li > p { margin-top: 0; margin-bottom: 0; }
            .prose code { background-color: #e5e7eb; padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 3px; }
            .prose pre { background-color: #e5e7eb; padding: 1em; border-radius: 0.5em; overflow-x: auto; }
            .prose pre code { background-color: transparent; padding: 0; }
        </style>
    </head>
    <body class="bg-slate-100 text-slate-800">
        <div id="login-modal" class="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all" style="animation: fadeIn 0.3s ease-out;">
                <h2 class="text-2xl font-bold mb-2 text-center text-slate-800">Thông Tin Học Sinh</h2>
                <p class="text-center text-slate-500 mb-6">Vui lòng nhập để bắt đầu làm bài.</p>
                <form id="student-info-form">
                    <div class="mb-4">
                        <label for="student-name" class="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                        <input type="text" id="student-name" required class="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:border-indigo-500 focus:ring-indigo-500">
                    </div>
                    <div class="mb-4">
                        <label for="student-class" class="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
                        <input type="text" id="student-class" required class="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:border-indigo-500 focus:ring-indigo-500">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-slate-700 mb-1">Giáo viên:</label>
                        <p class="mt-1 text-slate-800 bg-slate-100 p-2.5 rounded-lg">${teacherName}</p>
                    </div>
                    <button type="submit" class="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105">Bắt đầu làm bài</button>
                </form>
            </div>
        </div>

        <div class="container mx-auto p-4 md:p-8 max-w-4xl">
            <header class="mb-10 p-8 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-4xl font-bold">${title}</h1>
                        <p class="text-lg text-blue-100 mt-2">Hãy hoàn thành các câu hỏi dưới đây một cách tốt nhất!</p>
                        <p class="text-sm text-blue-200 mt-4">Tác giả: ${teacherName}</p>
                    </div>
                    <div id="timer-container" class="text-right">
                         <div id="timer-display" class="text-3xl font-bold tracking-wider bg-white/20 px-4 py-2 rounded-lg">--:--</div>
                         <div id="retries-display" class="text-sm mt-1 text-blue-200"></div>
                    </div>
                </div>
            </header>
            <main id="student-quiz-container" class="space-y-8 hidden">
                <!-- Questions will be rendered here by JS -->
            </main>
            <footer class="mt-10 text-center">
                <button id="submit-quiz-btn" class="bg-indigo-600 text-white py-3 px-12 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hidden transform hover:scale-105">Nộp Bài</button>
                <div id="result-container" class="mt-6 hidden"></div>
                <div id="post-submit-options" class="hidden mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button id="retry-quiz-btn" class="w-full sm:w-auto bg-slate-600 text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-slate-700 transition-transform transform hover:scale-105">Làm Lại Đề Này</button>
                </div>
            </footer>
        </div>

        <script>
            let quizData = ${JSON.stringify(quizDataForExport)};
            const quizOptions = ${JSON.stringify(options)};
            const apiKey = "${userApiKey}"; 
            const googleScriptUrl = "${googleScriptUrl}";
            const knowledgeBase = ${JSON.stringify(knowledgeBase)};
            let studentInfo = {};
            let isSubmitted = false;
            let timerInterval;
            let retriesLeft = quizOptions.retriesAllowed;
            let currentAudio = null; // To manage audio playback

            const studentQuizContainer = document.getElementById('student-quiz-container');
            const submitBtn = document.getElementById('submit-quiz-btn');
            const resultContainer = document.getElementById('result-container');
            const postSubmitOptions = document.getElementById('post-submit-options');
            const retryBtn = document.getElementById('retry-quiz-btn');
            const loginModal = document.getElementById('login-modal');
            const studentInfoForm = document.getElementById('student-info-form');
            const timerDisplay = document.getElementById('timer-display');
            const retriesDisplay = document.getElementById('retries-display');

            // --- Timer Function ---
            function startTimer(duration, display) {
                let timer = duration, minutes, seconds;
                clearInterval(timerInterval); // Clear any existing timer
                if(duration <= 0) {
                     display.textContent = "∞";
                     return;
                }
                timerInterval = setInterval(function () {
                    minutes = parseInt(timer / 60, 10);
                    seconds = parseInt(timer % 60, 10);

                    minutes = minutes < 10 ? "0" + minutes : minutes;
                    seconds = seconds < 10 ? "0" + seconds : seconds;

                    display.textContent = minutes + ":" + seconds;

                    if (--timer < 0) {
                        clearInterval(timerInterval);
                        alert("Hết giờ làm bài!");
                        handleSubmit();
                    }
                }, 1000);
            }

            // --- Gemini API Caller (for TTS) ---
            async function callGeminiAPI(payload, apiKey, model = 'gemini-2.5-flash-preview-tts') {
                 if (!apiKey) {
                    alert("API Key không hợp lệ. Không thể thực hiện yêu cầu.");
                    return null;
                }
                const API_URL = \`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${apiKey}\`;
                
                try {
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorBody = await response.json();
                        throw new Error(\`API Error: \${errorBody.error?.message || response.status}\`);
                    }
                    
                    const result = await response.json();
                    const candidate = result.candidates && result.candidates[0];

                    if (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                        return candidate.content.parts[0]; // Return the whole part
                    } else {
                         if (result.promptFeedback && result.promptFeedback.blockReason) {
                               throw new Error(\`API call blocked: \${result.promptFeedback.blockReason}\`);
                         }
                        return null;
                    }
                } catch (error) {
                    console.error("Lỗi khi gọi Gemini API:", error);
                    return null;
                }
            }
            
            // --- TTS Feature Functions ---
            function base64ToArrayBuffer(base64) {
                const binaryString = window.atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;
            }

            function pcmToWav(pcmData, sampleRate) {
                const numChannels = 1;
                const bytesPerSample = 2; // 16-bit
                const blockAlign = numChannels * bytesPerSample;
                const byteRate = sampleRate * blockAlign;
                const dataSize = pcmData.byteLength;
                const buffer = new ArrayBuffer(44 + dataSize);
                const view = new DataView(buffer);

                /* RIFF identifier */
                writeString(view, 0, 'RIFF');
                /* file length */
                view.setUint32(4, 36 + dataSize, true);
                /* RIFF type */
                writeString(view, 8, 'WAVE');
                /* format chunk identifier */
                writeString(view, 12, 'fmt ');
                /* format chunk length */
                view.setUint32(16, 16, true);
                /* sample format (raw) */
                view.setUint16(20, 1, true);
                /* channel count */
                view.setUint16(22, numChannels, true);
                /* sample rate */
                view.setUint32(24, sampleRate, true);
                /* byte rate (sample rate * block align) */
                view.setUint32(28, byteRate, true);
                /* block align (channel count * bytes per sample) */
                view.setUint16(32, blockAlign, true);
                /* bits per sample */
                view.setUint16(34, 16, true);
                /* data chunk identifier */
                writeString(view, 36, 'data');
                /* data chunk length */
                view.setUint32(40, dataSize, true);

                // Write PCM data
                const pcm16 = new Int16Array(pcmData);
                for (let i = 0; i < pcm16.length; i++) {
                    view.setInt16(44 + i * 2, pcm16[i], true);
                }

                function writeString(view, offset, string) {
                    for (let i = 0; i < string.length; i++) {
                        view.setUint8(offset + i, string.charCodeAt(i));
                    }
                }

                return new Blob([view], { type: 'audio/wav' });
            }

            async function playTTS(text, button) {
                if (currentAudio && !currentAudio.paused) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    document.querySelectorAll('.tts-btn.playing').forEach(b => b.classList.remove('playing'));
                    if (currentAudio.src.startsWith('blob:')) {
                        URL.revokeObjectURL(currentAudio.src);
                    }
                    if (currentAudio.dataset.text === text) {
                        currentAudio = null;
                        return; // Stop if the same button is clicked again
                    }
                }

                button.classList.add('playing');
                const originalIcon = button.innerHTML;
                button.innerHTML = '<div class="small-loader"></div>';
                button.disabled = true;

                try {
                    const payload = {
                        contents: [{ parts: [{ text: \`Nói một cách rõ ràng, tự nhiên: \${text}\` }] }],
                        generationConfig: { responseModalities: ["AUDIO"] },
                    };

                    const resultPart = await callGeminiAPI(payload, apiKey, 'gemini-2.5-flash-preview-tts');

                    if (resultPart && resultPart.inlineData) {
                        const audioData = resultPart.inlineData.data;
                        const mimeType = resultPart.inlineData.mimeType;
                        const sampleRateMatch = mimeType.match(/rate=(\\d+)/);
                        const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;

                        const pcmData = base64ToArrayBuffer(audioData);
                        const wavBlob = pcmToWav(pcmData, sampleRate);
                        const audioUrl = URL.createObjectURL(wavBlob);

                        currentAudio = new Audio(audioUrl);
                        currentAudio.dataset.text = text;
                        currentAudio.play();
                        currentAudio.onended = () => {
                            button.classList.remove('playing');
                            URL.revokeObjectURL(audioUrl);
                            currentAudio = null;
                        };
                    } else {
                        throw new Error("Không nhận được dữ liệu âm thanh.");
                    }
                } catch (error) {
                    console.error("Lỗi TTS:", error);
                    alert("Không thể phát âm thanh. Vui lòng thử lại.");
                     button.classList.remove('playing');
                } finally {
                    button.innerHTML = originalIcon;
                    button.disabled = false;
                }
            }

            function getTextForTTS(item) {
                let text = item.question || '';
                text = text.replace(/\\$/g, ''); // Remove LaTeX delimiters for cleaner speech

                if (item.type === 'multiple-choice' && item.options) {
                    const optionsText = item.options.map((opt, i) => \`\${String.fromCharCode(65 + i)}. \${opt}\`).join(' ');
                    text += ' ' + optionsText.replace(/\\$/g, '');
                } else if (item.type === 'true-false' && item.statements) {
                    const statementsText = item.statements.map((s, i) => \`\${String.fromCharCode(97 + i)}. \${s.statement}\`).join(' ');
                    text += ' ' + statementsText.replace(/\\$/g, '');
                }
                return text;
            }

            function renderStudentQuiz() {
                studentQuizContainer.innerHTML = '';
                
                const groupedQuestions = quizData.reduce((acc, q) => {
                    const type = q.type;
                    if (!acc[type]) {
                        acc[type] = [];
                    }
                    acc[type].push(q);
                    return acc;
                }, {});

                const groupInfo = {
                    'multiple-choice': { title: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN', subtitle: 'Chọn đáp án đúng nhất trong các lựa chọn sau.' },
                    'true-false': { title: 'PHẦN II. CÂU HỎI ĐÚNG - SAI', subtitle: 'Xác định tính đúng hoặc sai cho mỗi mệnh đề dưới đây.' },
                    'short-answer': { title: 'PHẦN III. CÂU HỎI TRẢ LỜI NGẮN', subtitle: 'Điền đáp án ngắn gọn vào phần trả lời.' },
                    'essay': { title: 'PHẦN IV. CÂU HỎI TỰ LUẬN', subtitle: 'Trình bày chi tiết bài giải của bạn.' }
                };
                
                let questionCounter = 0;
                const partOrder = ['multiple-choice', 'true-false', 'short-answer', 'essay'];

                partOrder.forEach(partType => {
                    const questions = groupedQuestions[partType];
                    if (!questions || questions.length === 0) return;
                    
                    const info = groupInfo[partType];
                    let groupHTML = \`<div class="group-container space-y-8 mb-12">\`;
                    groupHTML += \`
                        <div class="group-header pb-3 border-b-2 border-slate-300 mb-6">
                            <h2 class="text-2xl font-bold text-slate-800">\${info.title}</h2>
                            \${info.subtitle ? \`<p class="text-md text-slate-600 italic mt-1">\${info.subtitle}</p>\` : ''}
                        </div>
                    \`;

                    questions.forEach((item, localIndex) => {
                        const globalIndex = quizData.indexOf(item);
                        questionCounter++;
                        groupHTML += \`<div class="question-card" id="student-q-\${globalIndex}">\`;
                        let questionText = (item.question || '').replace(/\\n/g, '<br>');
                        
                        const textToSpeak = getTextForTTS(item);
                        
                        groupHTML += \`<div class="flex items-start">
                                     <div class="flex-grow">
                                         <div class="flex items-center mb-2">
                                             <span class="font-bold text-lg mr-3 text-indigo-600">Câu \${questionCounter}:</span>
                                             <div id="q-\${globalIndex}-feedback-icon"></div>
                                         </div>
                                         <div class="question-content mt-2 text-lg text-slate-700">\${questionText}</div>
                                         \${item.questionImage ? \`<img src="\${item.questionImage}" class="mt-4 rounded-lg max-w-full md:max-w-md border shadow-sm">\` : ''}
                                     </div>
                                     <button class="tts-btn ml-4 p-2 rounded-full text-gray-500 hover:text-indigo-600" data-text-to-speak="\${textToSpeak.replace(/"/g, '&quot;')}">
                                         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                             <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 5.858a3 3 0 014.243 0L12 7.757l1.9-1.9a3 3 0 014.242 0 3 3 0 010 4.242L12 16.242l-6.042-6.042a3 3 0 010-4.242z" />
                                         </svg>
                                     </button>
                                 </div>\`;
                        
                        groupHTML += \`<div class="mt-6">\`;
                        switch(item.type) {
                            case 'multiple-choice':
                                groupHTML += \`<div class="options-grid grid grid-cols-1 md:grid-cols-2 gap-4">\`;
                                item.options.forEach((opt, i) => {
                                    groupHTML += \`<label for="q\${globalIndex}-opt\${i}" id="q\${globalIndex}-opt-label\${i}" class="option-label flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400">
                                                 <input type="radio" name="q\${globalIndex}" id="q\${globalIndex}-opt\${i}" value="\${i}" class="mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                                                 <span class="font-semibold mx-3 text-slate-800">\${String.fromCharCode(65 + i)}.</span>
                                                 <div class="flex-grow option-content text-slate-700">\${opt}</div>
                                             </label>\`;
                                });
                                groupHTML += \`</div>\`;
                                break;
                            case 'true-false':
                                 groupHTML += \`<div class="space-y-4">\`;
                                 item.statements.forEach((s, i) => {
                                     groupHTML += \`<div class="statement-item border-t pt-4">
                                                  <p class="mb-3 text-slate-700">\${String.fromCharCode(97 + i)}) \${s.statement}</p>
                                                  <div class="flex gap-x-6">
                                                      <label class="flex items-center cursor-pointer"><input type="radio" name="q\${globalIndex}-s\${i}" value="true" class="mr-2 h-4 w-4"> Đúng</label>
                                                      <label class="flex items-center cursor-pointer"><input type="radio" name="q\${globalIndex}-s\${i}" value="false" class="mr-2 h-4 w-4"> Sai</label>
                                                  </div>
                                              </div>\`;
                                 });
                                 groupHTML += \`</div>\`;
                                 break;
                            case 'short-answer':
                                groupHTML += \`<input type="text" name="q\${globalIndex}" class="mt-1 block w-full md:w-1/2 border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Nhập đáp án của bạn...">\`;
                                break;
                            case 'essay':
                                groupHTML += \`<textarea name="q\${globalIndex}" class="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows="5" placeholder="Nhập câu trả lời tự luận của bạn..."></textarea>\`;
                                break;
                        }
                        groupHTML += \`</div><div id="q-\${globalIndex}-feedback" class="mt-4"></div></div>\`;
                    });
                    groupHTML += \`</div>\`;
                    studentQuizContainer.innerHTML += groupHTML;
                });
                

                if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                    MathJax.typesetPromise([studentQuizContainer]);
                }
                
                document.querySelectorAll('.tts-btn').forEach(btn => {
                    btn.addEventListener('click', () => playTTS(btn.dataset.textToSpeak, btn));
                });
            }

            function handleSubmit() {
                if (isSubmitted) return;
                isSubmitted = true;
                clearInterval(timerInterval);

                let score = 0;
                let total = quizData.filter(q => q.type !== 'essay').length; // Essays are not auto-graded
                const correctIcon = '<svg class="feedback-icon text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
                const incorrectIcon = '<svg class="feedback-icon text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';

                quizData.forEach((item, index) => {
                    const feedbackEl = document.getElementById(\`q-\${index}-feedback\`);
                    const feedbackIconEl = document.getElementById(\`q-\${index}-feedback-icon\`);
                    const questionCardEl = document.getElementById(\`student-q-\${index}\`);
                    feedbackEl.innerHTML = '';
                    
                    let isQuestionCorrect = false;

                    // Determine correctness
                    switch(item.type) {
                        case 'multiple-choice':
                            const selectedOption = document.querySelector(\`input[name="q\${index}"]:checked\`);
                            if (selectedOption) {
                                isQuestionCorrect = parseInt(selectedOption.value, 10) === item.correctAnswerIndex;
                            }
                            break;
                        case 'true-false':
                            let allStatementsCorrect = true;
                            item.statements.forEach((s, i) => {
                                const selectedValue = document.querySelector(\`input[name="q\${index}-s\${i}"]:checked\`);
                                if (!selectedValue || (selectedValue.value === 'true') !== s.is_correct) {
                                    allStatementsCorrect = false;
                                }
                            });
                            isQuestionCorrect = allStatementsCorrect;
                            break;
                        case 'short-answer':
                            const studentAnswerInput = document.querySelector(\`input[name="q\${index}"]\`);
                            if (studentAnswerInput) {
                                isQuestionCorrect = studentAnswerInput.value.trim().toLowerCase() === item.answer.trim().toLowerCase();
                            }
                            break;
                        case 'essay':
                            // Essays are not auto-graded for correctness, but we can show the feedback icon container.
                            break;
                    }

                    // Show correctness icon and border color
                    if (item.type !== 'essay') {
                        feedbackIconEl.innerHTML = isQuestionCorrect ? correctIcon : incorrectIcon;
                        score += isQuestionCorrect ? 1 : 0;
                    }
                    questionCardEl.style.borderLeftColor = isQuestionCorrect ? '#10b981' : '#ef4444';

                    // Add buttons for revealing answer and explanation
                    const actionsContainer = document.createElement('div');
                    actionsContainer.className = 'mt-4 flex flex-wrap gap-3';
                    feedbackEl.appendChild(actionsContainer);

                    if (quizOptions.showAnswers) {
                        const revealAnswerBtn = document.createElement('button');
                        revealAnswerBtn.className = 'text-sm font-semibold bg-blue-100 text-blue-800 py-1.5 px-3 rounded-md hover:bg-blue-200 transition';
                        revealAnswerBtn.textContent = 'Xem đáp án';
                        actionsContainer.appendChild(revealAnswerBtn);

                        let answerRevealed = false;
                        revealAnswerBtn.onclick = () => {
                            if (answerRevealed) return; // Prevent multiple clicks from adding more content
                            
                            switch(item.type) {
                                case 'multiple-choice':
                                    document.getElementById(\`q\${index}-opt-label\${item.correctAnswerIndex}\`).classList.add('correct');
                                    const selectedOption = document.querySelector(\`input[name="q\${index}"]:checked\`);
                                    if (selectedOption) {
                                        const selectedIndex = parseInt(selectedOption.value, 10);
                                        if (selectedIndex !== item.correctAnswerIndex) {
                                            document.getElementById(\`q\${index}-opt-label\${selectedIndex}\`).classList.add('incorrect');
                                        }
                                    }
                                    break;
                                case 'true-false':
                                case 'short-answer':
                                case 'essay':
                                    const answerContainer = document.createElement('div');
                                    answerContainer.className = 'w-full p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2 prose prose-sm max-w-none';
                                    let answerHTML = '';
                                    if (item.type === 'true-false') {
                                        answerHTML = '<strong>Đáp án đúng:</strong><ul class="list-disc list-inside ml-2 mt-1">';
                                        item.statements.forEach((s, i) => {
                                             answerHTML += \`<li>Mệnh đề \${String.fromCharCode(97 + i)}): \${s.is_correct ? '<strong>Đúng</strong>' : '<strong>Sai</strong>'}</li>\`;
                                        });
                                        answerHTML += '</ul>';
                                    } else {
                                        const title = item.type === 'essay' ? 'Gợi ý đáp án' : 'Đáp án đúng';
                                        const formattedAnswer = (item.answer || 'Không có.').replace(/\\n/g, '<br>');
                                        answerHTML = \`<strong>\${title}:</strong> \${formattedAnswer}\`;
                                    }
                                    answerContainer.innerHTML = answerHTML;
                                    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                                        window.MathJax.typesetPromise([answerContainer]);
                                    }
                                    break;
                            }
                            answerRevealed = true;
                            revealAnswerBtn.disabled = true;
                        };
                    }

                    if (quizOptions.showExplanation && item.explanation) {
                        const revealExplanationBtn = document.createElement('button');
                        revealExplanationBtn.className = 'text-sm font-semibold bg-purple-100 text-purple-800 py-1.5 px-3 rounded-md hover:bg-purple-200 transition';
                        revealExplanationBtn.textContent = 'Xem AI giải chi tiết';
                        actionsContainer.appendChild(revealExplanationBtn);

                        const explanationContainer = document.createElement('div');
                        explanationContainer.className = 'ai-explanation prose prose-sm max-w-none hidden';
                        feedbackEl.appendChild(explanationContainer);
                        
                        let explanationRevealed = false;
                        revealExplanationBtn.onclick = () => {
                            if (!explanationRevealed) {
                                explanationContainer.innerHTML = item.explanation.replace(/\\n/g, '<br>');
                                if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                                    window.MathJax.typesetPromise([explanationContainer]);
                                }
                                explanationRevealed = true;
                            }
                            explanationContainer.classList.toggle('hidden');
                        };
                    }
                });
                
                document.querySelectorAll('input, textarea').forEach(input => input.disabled = true);

                const lastScorePercentage = total > 0 ? (score / total) * 100 : 0;
                resultContainer.innerHTML = \`<div class="bg-white p-6 rounded-xl shadow-lg inline-block"><p class="text-2xl font-bold text-slate-800">Kết quả (phần trắc nghiệm): <span class="text-indigo-600">\${score} / \${total}</span> câu đúng</p></div>\`;
                resultContainer.classList.remove('hidden');
                submitBtn.classList.add('hidden');
                postSubmitOptions.classList.remove('hidden');

                if (retriesLeft > 0) {
                    retryBtn.classList.remove('hidden');
                } else {
                    retryBtn.classList.add('hidden');
                }

                // Send data to Google Sheet
                const formData = new FormData();
                formData.append('name', studentInfo.name);
                formData.append('class', studentInfo.class);
                formData.append('score', \`\${score}/\${total}\`);
                formData.append('timestamp', new Date().toLocaleString('vi-VN'));
                
                fetch(googleScriptUrl, { method: 'POST', body: formData})
                    .then(res => console.log("Successfully submitted to Google Sheet"))
                    .catch(err => console.error("Error submitting to Google Sheet:", err));
            }
            
            function startNewAttempt() {
                 isSubmitted = false;
                renderStudentQuiz();
                resultContainer.classList.add('hidden');
                postSubmitOptions.classList.add('hidden');
                submitBtn.classList.remove('hidden');
                 if (quizOptions.timeLimit > 0) {
                    const timeInSeconds = quizOptions.timeLimit * 60;
                    startTimer(timeInSeconds, timerDisplay);
                }
                retriesLeft--;
                retriesDisplay.textContent = \`Lượt làm lại còn: \${retriesLeft}\`;
                window.scrollTo(0, 0);
            }

            studentInfoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                studentInfo.name = document.getElementById('student-name').value;
                studentInfo.class = document.getElementById('student-class').value;
                loginModal.classList.add('hidden');
                studentQuizContainer.classList.remove('hidden');
                submitBtn.classList.remove('hidden');
                
                if (quizOptions.timeLimit > 0) {
                    const timeInSeconds = quizOptions.timeLimit * 60;
                    startTimer(timeInSeconds, timerDisplay);
                } else {
                    timerDisplay.textContent = "Không giới hạn";
                }

                retriesDisplay.textContent = \`Lượt làm lại còn: \${retriesLeft}\`;

                renderStudentQuiz();
            });

            // Attach the submit listener once.
            submitBtn.addEventListener('click', handleSubmit);

            retryBtn.addEventListener('click', () => {
                // Group questions by type to shuffle within parts
                const grouped = quizData.reduce((acc, q) => {
                    const type = q.type;
                    if (!acc[type]) {
                        acc[type] = [];
                    }
                    acc[type].push(q);
                    return acc;
                }, {});

                let shuffledQuizData = [];
                // Define the order of parts to maintain structure
                const partOrder = ['multiple-choice', 'true-false', 'short-answer', 'essay'];

                partOrder.forEach(partType => {
                    if (grouped[partType]) {
                        const partQuestions = grouped[partType];
                        // Shuffle questions within the current part (Fisher-Yates shuffle)
                        for (let i = partQuestions.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [partQuestions[i], partQuestions[j]] = [partQuestions[j], partQuestions[i]];
                        }
                        shuffledQuizData = shuffledQuizData.concat(partQuestions);
                    }
                });
                
                quizData = shuffledQuizData;
                startNewAttempt();
            });
        <\/script>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bai-tap-luyen-tap.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function handleExplainClick(event) {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return;
    }
    const btn = event.currentTarget;
    const index = parseInt(btn.dataset.index, 10);
    const questionCard = btn.closest('.question-card');
    const explanationContainer = questionCard.querySelector('.explanation-container');
    const explanationContent = explanationContainer.querySelector('.explanation-content');
    const loaderContainer = explanationContainer.querySelector('.loader-container');

    const isHidden = explanationContainer.classList.toggle('hidden');

    if (!isHidden && !explanationContent.innerHTML) { // Only fetch if it's being shown and is empty
        loaderContainer.style.display = 'block';
        explanationContent.style.display = 'none';
        btn.disabled = true;

        const item = quizData[index];
        item.explanation = item.explanation || ''; // Ensure explanation property exists

        if (!item.explanation) { // Only call API if explanation is not already fetched
            const questionText = item.type === 'true-false' ? item.main_question : item.question;
            let promptText = `Hãy cung cấp một lời giải chi tiết, từng bước một cho câu hỏi sau đây. Giải thích rõ ràng các khái niệm và công thức được sử dụng.\n---
CÂU HỎI:\n${questionText}\n---
`;
            if (item.type === 'multiple-choice') {
                promptText += `ĐÁP ÁN ĐÚNG: ${String.fromCharCode(65 + item.correctAnswerIndex)}. ${item.options[item.correctAnswerIndex]}`;
            } else if (item.type === 'true-false') {
                promptText += `CÁC MỆNH ĐỀ VÀ ĐÁP ÁN: ${item.statements.map(s => `${s.statement} -> ${s.is_correct ? 'Đúng' : 'Sai'}`).join('; ')}`;
            } else if (item.type === 'short-answer' || item.type === 'essay') { // short-answer or essay
                promptText += `ĐÁP ÁN / GỢI Ý: ${item.answer}`;
            }
            promptText += '\n---\nQUAN TRỌNG: Định dạng tất cả các công thức toán học bằng LaTeX. Khi giải thích, nếu cần tham chiếu đến đồ thị hoặc bảng, hãy mô tả nó bằng lời thay vì cố gắng vẽ lại.';
            
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: promptText });
            item.explanation = response.text || "Không thể tạo giải thích.";
        }
        
        explanationContent.innerHTML = item.explanation.replace(/\n/g, '<br>'); // Simple newline to br
        safeTypeset([explanationContent]);

        loaderContainer.style.display = 'none';
        explanationContent.style.display = 'block';
        btn.disabled = false;
    }
}

async function handleVaryClick(event) {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return;
    }
    const btn = event.currentTarget;
    const index = parseInt(btn.dataset.index, 10);
    const item = quizData[index];

    globalLoader.style.display = 'flex';
    btn.disabled = true;

    const type_description = {
        'multiple-choice': 'trắc nghiệm nhiều lựa chọn',
        'true-false': 'đúng/sai',
        'short-answer': 'trả lời ngắn',
        'essay': 'tự luận'
    };

    const schema_description = {
        'multiple-choice': '{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0-3}',
        'true-false': '{"main_question": "...", "statements": [{"statement": "...", "is_correct": true/false}, ... ]}',
        'short-answer': '{"question": "...", "answer": "..."}',
        'essay': '{"question": "...", "answer": "Gợi ý đáp án..."}'
    };

    const promptText = `Dựa vào câu hỏi sau đây, hãy tạo ra MỘT câu hỏi MỚI có nội dung tương tự nhưng với các số liệu và ngữ cảnh khác.
---
CÂU HỎI GỐC (dạng ${type_description[item.type]}):
${JSON.stringify(item)}
---
YÊU CẦU:
1.  Câu hỏi mới phải cùng loại (${type_description[item.type]}) và có cùng mức độ khó.
2.  Sử dụng các số liệu, tham số, hoặc tình huống khác để câu hỏi là duy nhất.
3.  Định dạng toàn bộ công thức toán học bằng LaTeX ($...$ và $$...$$).
4.  Trả về duy nhất MỘT object JSON theo đúng cấu trúc sau: ${schema_description[item.type]}.
5.  Khi tạo bảng biến thiên hoặc bất kỳ bảng nào khác, PHẢI sử dụng môi trường \`\\begin{array} ... \\end{array}\` của LaTeX. Ví dụ: \`$$\\begin{array}{c|ccccccc} x & -\\infty & & 0 & & 2 & & +\\infty \\\\ \\hline f'(x) & & + & 0 & - & 0 & + & \\\\ \\hline f(x) & & \\nearrow & f(0) & \\searrow & f(2) & \\nearrow & \\end{array}$$\`
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptText,
            config: { responseMimeType: "application/json" }
        });
        
        const resultText = response.text;
        if (resultText) {
            const newQuestion = JSON.parse(resultText);
            quizData[index] = { ...newQuestion, type: item.type, questionNumber: item.questionNumber }; // Preserve type and original number
            renderQuiz();
        } else {
            alert("Không thể tạo câu hỏi tương tự. Vui lòng thử lại.");
        }
    } catch (error) {
        console.error("Lỗi khi tạo câu hỏi tương tự:", error);
        alert("Đã xảy ra lỗi khi tạo câu hỏi tương tự. Vui lòng xem console để biết chi tiết.");
    } finally {
        globalLoader.style.display = 'none';
        btn.disabled = false;
    }
}

async function analyzeFileForQuiz(file) {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return;
    }
    const originalHTML = analyzeFileLabel.innerHTML;
    toggleUploadLoading(true, analyzeFileLabel, originalHTML);
    globalLoader.style.display = 'flex';

    try {
        let textContent;

        // --- Step 1: Extract Text Content ---
        if (file.type === 'application/pdf') {
            setUploadStatus(uploadStatusFile, `Đang trích xuất văn bản từ PDF...`);
            textContent = await extractTextFromPdf(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            setUploadStatus(uploadStatusFile, `Đang trích xuất văn bản từ DOCX...`);
            textContent = await extractTextFromDocx(file);
        } else {
            throw new Error("Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp PDF hoặc DOCX.");
        }

        if (!textContent || textContent.trim().length < 20) {
            throw new Error("Không thể trích xuất nội dung văn bản hoặc nội dung quá ngắn để phân tích.");
        }
        
        setUploadStatus(uploadStatusFile, `Đã trích xuất nội dung. AI đang phân tích đề thi...`);

        // --- Step 2: Build the AI Prompt ---
        const systemPrompt = `Bạn là một AI chuyên gia phân tích đề thi. Dựa vào nội dung văn bản được cung cấp, hãy trích xuất TẤT CẢ các câu hỏi thành một mảng JSON duy nhất.

QUY TẮC PHÂN TÍCH:
-   **Output:** Toàn bộ output phải là một mảng JSON duy nhất.
-   **Số thứ tự:** BẮT BUỘC trích xuất số thứ tự gốc của câu hỏi (ví dụ: 'Câu 1' -> 1,'Câu 2' -> 2, 'Câu 3' -> 3... ) và đặt vào trường "questionNumber".
-   **Định dạng Toán học:** Tất cả công thức toán học PHẢI được định dạng bằng LaTeX (sử dụng $...$ và $$...$$).
-   **Bảng biểu:** Khi tạo bảng biến thiên hoặc bất kỳ bảng nào khác, PHẢI sử dụng môi trường \`\\begin{array} ... \\end{array}\` của LaTeX. Ví dụ: \`$$\\begin{array}{c|ccccccc} x & -\\infty & & 0 & & 2 & & +\\infty \\\\ \\hline f'(x) & & + & 0 & - & 0 & + & \\\\ \\hline f(x) & & \\nearrow & f(0) & \\searrow & f(2) & \\nearrow & \\end{array}$$\`
-   **Tìm đáp án đúng:** Hãy nỗ lực hết sức để tìm đáp án đúng cho mọi loại câu hỏi (dựa vào văn bản gạch chân, in đậm, hoặc bảng đáp án). Nếu không tìm thấy, hãy tự giải để tìm ra đáp án.

CẤU TRÚC JSON CHO TỪNG LOẠI CÂU HỎI:
1.  **Trắc nghiệm (multiple-choice):**
    -   \`{"type": "multiple-choice", "questionNumber": <số>, "question": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": <0-3>}\`
    -   "options" không chứa tiền tố 'A.', 'B.'.
2.  **Đúng/Sai (true-false):**
    -   \`{"type": "true-false", "questionNumber": <số>, "main_question": "...", "statements": [{"statement": "...", "is_correct": true/false}]}\`
3.  **Trả lời ngắn (short-answer):**
    -   \`{"type": "short-answer", "questionNumber": <số>, "question": "...", "answer": "..."}\`
4.  **Tự luận (essay):**
    -   \`{"type": "essay", "questionNumber": <số>, "question": "...", "answer": "Gợi ý..."}\`

---
BẮT ĐẦU PHÂN TÍCH NỘI DUNG VĂN BẢN:
${textContent}`;
        
        // --- Step 3: Call AI and Process Response ---
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const resultText = response.text;
        if (resultText) {
            let cleanedText = resultText.trim();
            if (cleanedText.startsWith('```json')) cleanedText = cleanedText.substring(7);
            if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
            
            let newQuizData = JSON.parse(cleanedText);
            
            quizData = newQuizData.map(q => ({...q, isDirty: false, explanation: null }));
            
            // Update UI
            workflowFileSteps.classList.add('hidden');
            quizArea.classList.remove('hidden');
            resultTabsContainer.classList.remove('hidden');

            renderQuiz();
            tabContentMatrix.innerHTML = '<p class="p-4 text-center text-gray-500">Ma trận không được tạo khi phân tích từ tệp có sẵn.</p>';
            tabContentSpec.innerHTML = '<p class="p-4 text-center text-gray-500">Bản đặc tả không được tạo khi phân tích từ tệp có sẵn.</p>';
            
            // Activate the first tab by default
            handleTabClick({ target: resultTabs.querySelector('[data-tab="exam"]') });


            setUploadStatus(uploadStatusFile, `✓ Phân tích thành công ${quizData.length} câu hỏi từ tệp.`, false);
        } else {
            throw new Error("AI không thể phân tích văn bản.");
        }

    } catch (error) {
        console.error("Lỗi khi phân tích tệp:", error);
        let errorMessage = error.message;
        if (error.cause) {
            try {
                const causeBody = JSON.parse(error.cause.message.split('\n').slice(1).join('\n'));
                if(causeBody.error && causeBody.error.message) {
                    errorMessage = causeBody.error.message;
                }
            } catch(e) { /* Ignore parsing error */ }
        }
        setUploadStatus(uploadStatusFile, `Lỗi phân tích tệp: ${errorMessage}`, true);
    } finally {
        toggleUploadLoading(false, analyzeFileLabel, originalHTML);
        analyzeFileInput.value = '';
        globalLoader.style.display = 'none';
    }
}

function resetToWorkflowChoice() {
    // Hide all workflow steps and the quiz display area
    workflowAiSteps.classList.add('hidden');
    workflowFileSteps.classList.add('hidden');
    quizArea.classList.add('hidden');
    resultTabsContainer.classList.add('hidden');
    
    // Show the main choice card and ensure it's enabled
    cardWorkflowChoice.classList.remove('hidden');
    if(userApiKey) {
      cardWorkflowChoice.classList.remove('disabled-card');
    }

    // Reset quiz data and render the placeholder (which will be in the hidden quizArea)
    quizData = [];
    renderQuiz(); 

    // Reset state for the next generation
    requestBatch = [];
    knowledgeBase = "";
    uploadStatusAi.textContent = 'Chưa có tệp nào được chọn.';
    uploadStatusFile.textContent = 'Chưa có tệp nào được chọn.';
    if(additionalPromptInput) additionalPromptInput.value = '';
    renderRequestBatch();
    tabContentMatrix.innerHTML = '';
    tabContentSpec.innerHTML = '';


    // Reset the AI workflow UI to its initial state
    subjectSelect.value = '';
    subjectDependentSteps.classList.add('opacity-50', 'pointer-events-none');
    gradeSelect.innerHTML = '';
    chapterSelect.innerHTML = '';
    topicSelect.innerHTML = '';
    topicPreviewContainer.classList.add('hidden');
    setDataChanged(false); // Hide the save button
}

function handleDeleteClick(event) {
    const btn = event.currentTarget;
    const index = parseInt(btn.dataset.index, 10);
    if (isNaN(index)) return;

    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này không?')) {
        quizData.splice(index, 1);
        renderQuiz();
    }
}

function handleEditClick(event) {
    const target = event.currentTarget;
    const index = parseInt(target.dataset.index, 10);
    if (isNaN(index)) return;

    currentEditingIndex = index;
    const item = quizData[index];

    // Clear previous state
    editOptionsContainer.innerHTML = '';
    
    // Populate image and controls
    const imageContainer = document.getElementById('edit-question-image-container');
    if (item.questionImage) {
        imageContainer.innerHTML = `<img src="${item.questionImage}" class="max-h-48 mx-auto rounded-md border" alt="Xem trước ảnh">`;
        editDeleteImageBtn.classList.remove('hidden');
    } else {
        imageContainer.innerHTML = '<span class="text-gray-400 text-sm">Chưa có ảnh</span>';
        editDeleteImageBtn.classList.add('hidden');
    }

    // Populate text and options based on type
    if (item.type === 'multiple-choice') {
        editQuestionText.value = item.question;
        const optionsHTML = item.options.map((opt, i) => `
            <div class="flex items-center gap-2">
                <input type="radio" id="edit-opt-radio-${i}" name="correct-option" value="${i}" ${i === item.correctAnswerIndex ? 'checked' : ''} class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                <input type="text" value="${opt.replace(/"/g, '&quot;')}" class="flex-grow border-gray-300 rounded-md shadow-sm p-2">
            </div>
        `).join('');
        editOptionsContainer.innerHTML = `
            <label class="font-medium text-gray-700">Đáp án:</label>
            <div class="space-y-2">${optionsHTML}</div>
        `;
    } else if (item.type === 'true-false') {
        editQuestionText.value = item.main_question;
        const statementsHTML = item.statements.map((stmt, i) => `
             <div class="flex items-center gap-2">
                <input type="checkbox" id="edit-stmt-check-${i}" ${stmt.is_correct ? 'checked' : ''} class="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300">
                <input type="text" value="${stmt.statement.replace(/"/g, '&quot;')}" class="flex-grow border-gray-300 rounded-md shadow-sm p-2">
            </div>
        `).join('');
        editOptionsContainer.innerHTML = `
            <label class="font-medium text-gray-700">Mệnh đề:</label>
            <div class="space-y-2">${statementsHTML}</div>
        `;
    } else if (item.type === 'short-answer') {
        editQuestionText.value = item.question;
        editOptionsContainer.innerHTML = `
            <label for="edit-answer-text" class="font-medium text-gray-700">Đáp án:</label>
            <input type="text" id="edit-answer-text" value="${item.answer.replace(/"/g, '&quot;')}" class="w-full border-gray-300 rounded-md shadow-sm p-2">
        `;
    } else if (item.type === 'essay') {
        editQuestionText.value = item.question;
        editOptionsContainer.innerHTML = `
            <label for="edit-answer-text" class="font-medium text-gray-700">Đáp án/Gợi ý:</label>
            <textarea id="edit-answer-text" rows="4" class="w-full border-gray-300 rounded-md shadow-sm p-2">${item.answer}</textarea>
        `;
    }

    editModal.classList.remove('hidden');
}

function handleSaveEdit() {
    if (currentEditingIndex === -1) return;

    const item = quizData[currentEditingIndex];
    item.isDirty = true; // Mark as dirty since it's a manual edit

    // Handle image saving
    const imageContainer = document.getElementById('edit-question-image-container');
    const previewImg = imageContainer.querySelector('img');
    if (previewImg && previewImg.src && !previewImg.src.startsWith('https://placehold.co')) {
        item.questionImage = previewImg.src;
    } else {
        item.questionImage = null;
    }

    const newQuestionText = editQuestionText.value;

    if (item.type === 'multiple-choice') {
        item.question = newQuestionText;
        const optionInputs = editOptionsContainer.querySelectorAll('input[type="text"]');
        const radioInputs = editOptionsContainer.querySelectorAll('input[type="radio"]');
        item.options = Array.from(optionInputs).map(input => input.value);
        const newCorrectIndex = Array.from(radioInputs).findIndex(radio => radio.checked);
        item.correctAnswerIndex = newCorrectIndex > -1 ? newCorrectIndex : 0;
    } else if (item.type === 'true-false') {
        item.main_question = newQuestionText;
        const statementTextInputs = editOptionsContainer.querySelectorAll('input[type="text"]');
        const statementCheckboxes = editOptionsContainer.querySelectorAll('input[type="checkbox"]');
        item.statements = Array.from(statementTextInputs).map((input, i) => ({
            statement: input.value,
            is_correct: statementCheckboxes[i].checked
        }));
    } else if (item.type === 'short-answer' || item.type === 'essay') {
        item.question = newQuestionText;
        const answerInput = document.getElementById('edit-answer-text');
        item.answer = answerInput.value;
    }

    editModal.classList.add('hidden');
    currentEditingIndex = -1;
    renderQuiz();
}

async function handleFinalizeEdits() {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return;
    }
    const dirtyQuestions = quizData.map((q, i) => ({ q, i })).filter(item => item.q.isDirty);
    if (dirtyQuestions.length === 0) return;

    globalLoader.style.display = 'flex';

    try {
        const formatPromises = dirtyQuestions.map(async ({ q, i }) => {
            const formattedQuestion = JSON.parse(JSON.stringify(q)); // Deep copy

            // Format main question text
            if (formattedQuestion.type === 'true-false') {
                formattedQuestion.main_question = await formatTextWithLatex(formattedQuestion.main_question);
            } else {
                formattedQuestion.question = await formatTextWithLatex(formattedQuestion.question);
            }

            // Format other parts
            if (formattedQuestion.type === 'multiple-choice') {
                formattedQuestion.options = await Promise.all(formattedQuestion.options.map((opt) => formatTextWithLatex(opt)));
            } else if (formattedQuestion.type === 'true-false') {
                formattedQuestion.statements = await Promise.all(formattedQuestion.statements.map(async (stmt) => ({
                    ...stmt,
                    statement: await formatTextWithLatex(stmt.statement)
                })));
            } else if (item.type === 'short-answer' || item.type === 'essay') {
                formattedQuestion.answer = await formatTextWithLatex(formattedQuestion.answer);
            }

            formattedQuestion.isDirty = false;
            return { index: i, data: formattedQuestion };
        });

        const results = await Promise.all(formatPromises);
        results.forEach(result => {
            quizData[result.index] = result.data;
        });

    } catch (error) {
        console.error("Error finalizing edits:", error);
        alert("Có lỗi xảy ra trong quá trình định dạng lại bằng AI.");
    } finally {
        globalLoader.style.display = 'none';
        renderQuiz();
    }
}

async function handleGenerateStudyGuide() {
    if (!ai || quizData.length === 0) {
        alert("Vui lòng cấu hình API Key và có ít nhất một câu hỏi trong đề.");
        return;
    }
    studyGuideModal.classList.remove('hidden');
    studyGuideModal.classList.add('flex');
    studyGuideContent.classList.add('hidden');
    studyGuideLoader.classList.remove('hidden');

    const quizContent = JSON.stringify(quizData);
    const prompt = `Dựa vào bộ câu hỏi JSON sau đây, hãy tạo một đề cương ôn tập chi tiết cho học sinh. Đề cương cần:
1.  Tóm tắt các chủ đề và dạng bài chính có trong đề.
2.  Liệt kê các công thức, định lý, và khái niệm quan trọng cần nhớ.
3.  Cung cấp một vài ví dụ minh họa hoặc bài tập tự luyện tương tự (không cần đáp án).
4.  Trình bày rõ ràng, dễ hiểu, sử dụng markdown và định dạng LaTeX cho công thức toán học.
---
BỘ CÂU HỎI:
${quizContent}`;

    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        let content = response.text || "Không thể tạo đề cương.";
        
        // Basic markdown to HTML conversion
        let htmlContent = content
            .replace(/```latex\n([\s\S]*?)\n```/g, (match, p1) => `$$${p1}$$`)
            .replace(/```([\s\S]*?)```/g, (match, p1) => `<pre><code>${p1.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b pb-2">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4 border-b-2 pb-2">$1</h1>')
            .replace(/^\s*-\s(.*$)/gim, '<li class="ml-5 list-disc">$1</li>')
            .replace(/\n/g, '<br>');
        
        // Wrap lists in ul
        htmlContent = htmlContent.replace(/<li class="ml-5 list-disc">/g, '<ul><li class="ml-5 list-disc">');
        htmlContent = htmlContent.replace(/<\/li><br><ul>/g, '</li></ul><ul>');
        htmlContent = htmlContent.replace(/<\/li>(?!<li)/g, '</li></ul>');


        studyGuideContent.innerHTML = htmlContent;
        safeTypeset([studyGuideContent]);

    } catch (error) {
        console.error("Error generating study guide:", error);
        studyGuideContent.innerHTML = "<p class='text-red-500'>Đã có lỗi xảy ra. Vui lòng thử lại.</p>";
    } finally {
        studyGuideLoader.classList.add('hidden');
        studyGuideContent.classList.remove('hidden');
    }
}

// --- Topic Selector Logic ---
function populateGrades() {
    const grades = Object.keys(workingExamData);
    gradeSelect.innerHTML = '<option value="">-- Chọn Lớp/Khối --</option>' + grades.map(g => `<option value="${g}">${g}</option>`).join('');
    
    // Reset subsequent selects
    chapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    topicSelect.innerHTML = '<option value="">-- Chọn Chủ đề --</option>';
    chapterSelect.disabled = true;
    topicSelect.disabled = true;
    topicPreviewContainer.classList.add('hidden');
}

function populateChapters() {
    const grade = gradeSelect.value;
    chapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    topicSelect.innerHTML = '<option value="">-- Chọn Chủ đề --</option>';
    chapterSelect.disabled = true;
    topicSelect.disabled = true;
    topicPreviewContainer.classList.add('hidden');

    if (grade && workingExamData[grade]) {
        const chapters = [...new Set(Object.values(workingExamData[grade]).map(topic => topic.chapter))];
        chapterSelect.innerHTML += chapters.map(c => `<option value="${c}">${c}</option>`).join('');
        chapterSelect.disabled = false;
    }
}

function populateTopics() {
    const grade = gradeSelect.value;
    const chapter = chapterSelect.value;
    topicSelect.innerHTML = '<option value="">-- Chọn Chủ đề --</option>';
    topicSelect.disabled = true;
    topicPreviewContainer.classList.add('hidden');

    if (grade && chapter && workingExamData[grade]) {
        const topics = Object.keys(workingExamData[grade]).filter(topicName => workingExamData[grade][topicName].chapter === chapter);
        topicSelect.innerHTML += topics.map(t => `<option value="${t}">${t}</option>`).join('');
        topicSelect.disabled = false;
    }
}

function updateTopicPreview() {
    const grade = gradeSelect.value;
    const topicName = topicSelect.value;
    
    topicObjectivesList.innerHTML = ''; // Clear previous list
    aiSuggestionsContainer.classList.add('hidden'); // Hide AI suggestions
    aiSuggestionsContainer.innerHTML = '';


    if (grade && topicName && workingExamData[grade] && workingExamData[grade][topicName]) {
        const topicData = workingExamData[grade][topicName];
        if (topicData.objectives && topicData.objectives.length > 0) {
             topicData.objectives.forEach((obj, index) => {
                const objectiveItem = document.createElement('div');
                objectiveItem.className = 'objective-item flex items-center justify-between p-1 rounded hover:bg-slate-100 group';
                objectiveItem.dataset.index = index;
                objectiveItem.innerHTML = `
                    <div class="flex items-start flex-grow gap-x-2.5">
                        <input type="checkbox" id="obj-check-${index}" value="${obj.replace(/"/g, '&quot;')}" class="h-4 w-4 mt-1 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                        <label for="obj-check-${index}" class="text-sm text-gray-800 cursor-pointer flex-grow">${obj}</label>
                    </div>
                    <div class="flex-shrink-0 flex items-center gap-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button data-objective-index="${index}" class="edit-objective-btn p-1 text-gray-400 hover:text-blue-600" title="Sửa mục tiêu">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg>
                         </button>
                         <button data-objective-index="${index}" class="delete-objective-btn p-1 text-gray-400 hover:text-red-600" title="Xóa mục tiêu">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                         </button>
                    </div>
                `;
                topicObjectivesList.appendChild(objectiveItem);
            });
            // Add event listeners to new buttons
            topicObjectivesList.querySelectorAll('.edit-objective-btn').forEach(btn => btn.addEventListener('click', handleEditObjective));
            topicObjectivesList.querySelectorAll('.delete-objective-btn').forEach(btn => btn.addEventListener('click', handleDeleteObjective));
        } else {
            topicObjectivesList.innerHTML = `<p class="text-sm text-gray-500">Chủ đề này chưa có mục tiêu chi tiết.</p>`;
        }
       
        topicPreviewContainer.classList.remove('hidden');
    } else {
        topicPreviewContainer.classList.add('hidden');
    }
}

async function initializeSubjectData(subject) {
    if (!subject) {
        subjectDependentSteps.classList.add('opacity-50', 'pointer-events-none');
        return;
    }

    const subjectFileMap = {
        'gd': 'GDKTPL.json',
        'toan': 'Toan.json',
        'su': 'Su.json',
    };
    const fileName = subjectFileMap[subject] || `${subject}.json`;
    
    currentSubject = subject;
    globalLoader.style.display = 'flex';
    
    try {
        const savedData = localStorage.getItem(`examData_${subject}`);
        if (savedData) {
            workingExamData = JSON.parse(savedData);
            setDataChanged(false, true); // fromLocal = true
        } else {
            const response = await fetch(`./${fileName}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            workingExamData = await response.json();
            setDataChanged(false); 
        }
        
        populateGrades();
        subjectDependentSteps.classList.remove('opacity-50', 'pointer-events-none');

    } catch (e) {
        console.error(`Lỗi khi tải dữ liệu cho môn '${subject}' từ tệp '${fileName}':`, e);
        alert(`Không thể tải dữ liệu cho môn học đã chọn. Vui lòng kiểm tra lại tệp ${fileName}.`);
        subjectDependentSteps.classList.add('opacity-50', 'pointer-events-none');
    } finally {
        globalLoader.style.display = 'none';
    }
}

function setDataChanged(isChanged, fromLocal = false) {
    dataHasChanged = isChanged;
    saveToLocalBtn.classList.toggle('hidden', !isChanged);
    
    const localDataExists = localStorage.getItem(`examData_${currentSubject}`);
    revertSubjectDataBtn.classList.toggle('hidden', !localDataExists);

    if (fromLocal) {
        dataStatusIndicator.textContent = 'Đã tải dữ liệu đã lưu.';
    } else if (isChanged) {
        dataStatusIndicator.textContent = 'Dữ liệu đã thay đổi.';
    } else {
        dataStatusIndicator.textContent = '';
    }
}

// --- New Event Handlers for Interactive Objectives ---
function handleAddObjectivesToPrompt() {
    if (!additionalPromptInput) return;
    const selectedObjectives = [];
    topicObjectivesList.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        selectedObjectives.push(checkbox.value);
    });

    if (selectedObjectives.length > 0) {
        const currentText = additionalPromptInput.value.trim();
        const newText = selectedObjectives.join('. ');
        additionalPromptInput.value = currentText ? `${currentText}. ${newText}` : newText;
        // Uncheck boxes after adding
        topicObjectivesList.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });
    } else {
        alert('Vui lòng chọn ít nhất một mục tiêu để thêm.');
    }
}

function handleSaveCustomObjective() {
    const grade = gradeSelect.value;
    const topic = topicSelect.value;
    const newObjectiveText = newObjectiveInput.value.trim();

    if (!currentSubject || !grade || !topic) {
        alert('Vui lòng chọn Môn, Lớp và Chủ đề trước khi lưu mục tiêu mới.');
        return;
    }
    if (!newObjectiveText) {
        alert('Vui lòng nhập nội dung cho mục tiêu mới vào ô yêu cầu.');
        return;
    }

    if (workingExamData[grade] && workingExamData[grade][topic]) {
        if (!workingExamData[grade][topic].objectives) {
            workingExamData[grade][topic].objectives = [];
        }
        workingExamData[grade][topic].objectives.push(newObjectiveText);
        setDataChanged(true);
        updateTopicPreview();
        newObjectiveInput.value = '';
    } else {
        alert('Không tìm thấy dữ liệu cho chủ đề đã chọn.');
    }
}

function handleDeleteObjective(event) {
    const btn = event.currentTarget;
    const objectiveIndex = parseInt(btn.dataset.objectiveIndex, 10);
    const grade = gradeSelect.value;
    const topic = topicSelect.value;

    if (!currentSubject || !grade || !topic || isNaN(objectiveIndex)) return;

    if (confirm("Bạn có chắc chắn muốn xóa mục tiêu này không?")) {
        if (workingExamData?.[grade]?.[topic]?.objectives) {
            workingExamData[grade][topic].objectives.splice(objectiveIndex, 1);
            setDataChanged(true);
            updateTopicPreview();
        }
    }
}

function handleEditObjective(event) {
    const btn = event.currentTarget;
    const objectiveIndex = parseInt(btn.dataset.objectiveIndex, 10);
    const objectiveItem = btn.closest('.objective-item');
    const currentText = workingExamData[gradeSelect.value][topicSelect.value].objectives[objectiveIndex];

    objectiveItem.innerHTML = `
        <input type="text" value="${currentText.replace(/"/g, '&quot;')}" class="flex-grow border-gray-300 rounded-md shadow-sm p-1 text-sm w-full">
        <div class="flex-shrink-0 flex items-center gap-x-1">
            <button data-objective-index="${objectiveIndex}" class="save-objective-edit-btn p-1 text-green-600 hover:text-green-800" title="Lưu thay đổi">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </button>
            <button class="cancel-objective-edit-btn p-1 text-red-600 hover:text-red-800" title="Hủy">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    `;
    objectiveItem.querySelector('.save-objective-edit-btn').addEventListener('click', handleSaveObjectiveEdit);
    objectiveItem.querySelector('.cancel-objective-edit-btn').addEventListener('click', updateTopicPreview);
}

function handleSaveObjectiveEdit(event) {
    const btn = event.currentTarget;
    const objectiveIndex = parseInt(btn.dataset.objectiveIndex, 10);
    const objectiveItem = btn.closest('.objective-item');
    const newText = objectiveItem.querySelector('input[type="text"]').value;
    const grade = gradeSelect.value;
    const topic = topicSelect.value;

    if (workingExamData?.[grade]?.[topic]?.objectives) {
        workingExamData[grade][topic].objectives[objectiveIndex] = newText;
        setDataChanged(true);
        updateTopicPreview();
    }
}

function handleSaveToLocal() {
    if (!dataHasChanged || !currentSubject) return;
    try {
        localStorage.setItem(`examData_${currentSubject}`, JSON.stringify(workingExamData));
        setDataChanged(false);
        dataStatusIndicator.textContent = 'Đã lưu thay đổi vào trình duyệt.';
        revertSubjectDataBtn.classList.remove('hidden');
        alert('Đã lưu các thay đổi của bạn vào bộ nhớ đệm của trình duyệt.');
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        alert("Lỗi khi lưu dữ liệu vào trình duyệt.");
    }
}

function handleRevertData() {
    if (!currentSubject) return;
    if (confirm(`Bạn có chắc muốn xóa tất cả các thay đổi đã lưu cho môn ${currentSubject} và tải lại dữ liệu gốc không?`)) {
        localStorage.removeItem(`examData_${currentSubject}`);
        initializeSubjectData(currentSubject); // Reload original data
        alert(`Đã khôi phục dữ liệu gốc cho môn ${currentSubject}.`);
    }
}

function handleUploadJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            if (typeof jsonData === 'object' && !Array.isArray(jsonData) && jsonData !== null) {
                workingExamData = jsonData;
                populateGrades();
                setDataChanged(true);
                alert(`Đã tải lên thành công tệp ${file.name}. Nhấn "Lưu thay đổi" để lưu vào trình duyệt hoặc "Tải File" để tải về.`);
            } else {
                throw new Error("Invalid JSON format.");
            }
        } catch (error) {
            console.error("Error parsing uploaded JSON:", error);
            alert("Tệp JSON không hợp lệ hoặc bị lỗi.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

function handleSaveAndDownloadData() {
    if (!currentSubject) return;

    try {
        const jsonString = JSON.stringify(workingExamData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentSubject}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Tệp ${currentSubject}.json đã được tải về. Hãy dùng tệp này để thay thế tệp cũ trong thư mục ứng dụng.`);
        if (dataHasChanged) {
           // Optionally save to local storage as well when downloading
           handleSaveToLocal();
        }

    } catch (e) {
        console.error("Lỗi khi tạo và tải tệp JSON:", e);
        alert("Đã xảy ra lỗi khi cố gắng lưu dữ liệu.");
    }
}

async function handleAiSuggestionClick() {
    if (!ai) {
        alert("Vui lòng cấu hình API Key trước.");
        return;
    }
    const grade = gradeSelect.value;
    const chapter = chapterSelect.value;
    const topic = topicSelect.value;

    if (!grade || !chapter || !topic) {
        alert("Vui lòng chọn đầy đủ Môn, Lớp, Chương và Chủ đề trước khi nhận gợi ý.");
        return;
    }

    aiSuggestionsContainer.classList.remove('hidden');
    aiSuggestionsContainer.innerHTML = `<div class="flex items-center justify-center p-4"><div class="small-loader"></div><p class="ml-2 text-sm text-gray-600">AI đang suy nghĩ gợi ý...</p></div>`;
    
    try {
        const topicData = workingExamData[grade][topic];
        const prompt = `Dựa trên các thông tin sau về một chủ đề trong chương trình giáo dục Việt Nam:
- Môn học: ${subjectSelect.options[subjectSelect.selectedIndex].text}
- Lớp: ${grade}
- Chương: ${chapter}
- Chủ đề: ${topic}
- Nội dung chính: ${topicData.content}
- Mục tiêu học tập: ${topicData.objectives.join('. ')}
- Dạng bài tập thường gặp: ${topicData.common_exercises.join('. ')}

Hãy tạo ra một danh sách gồm 5 gợi ý ngắn gọn (mỗi gợi ý là một chuỗi) về các dạng bài tập hoặc yêu cầu cụ thể, sáng tạo, phù hợp để đưa vào đề kiểm tra về chủ đề này. Các gợi ý cần bám sát mục tiêu học tập và có thể bao gồm các dạng bài như tìm tham số 'm', bài toán thực tế, so sánh, phân tích đồ thị, v.v.

Chỉ trả về kết quả dưới dạng một mảng JSON các chuỗi. Ví dụ: ["Dạng 1...", "Dạng 2...", "Dạng 3", "Dạng 4", "Dạng 5"]`;

        const schema = {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const suggestions = JSON.parse(response.text);
        
        aiSuggestionsContainer.innerHTML = ''; // Clear loader
        suggestions.forEach(suggestion => {
            const suggestionEl = document.createElement('button');
            suggestionEl.type = 'button';
            suggestionEl.className = 'w-full text-left p-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm text-gray-800 transition-colors duration-200';
            suggestionEl.textContent = `💡 ${suggestion}`;
            suggestionEl.onclick = () => {
                if(newObjectiveInput) newObjectiveInput.value = suggestion;
            };
            aiSuggestionsContainer.appendChild(suggestionEl);
        });

    } catch (error) {
        console.error("Lỗi khi lấy gợi ý từ AI:", error);
        aiSuggestionsContainer.innerHTML = `<p class="text-red-600 text-sm">Không thể lấy gợi ý. Vui lòng thử lại.</p>`;
    }
}
// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    const savedScriptUrl = localStorage.getItem('googleScriptUrl');
    const savedTeacherName = localStorage.getItem('teacherName');

    if (savedScriptUrl) {
        googleScriptUrlInput.value = savedScriptUrl;
        googleScriptUrl = savedScriptUrl;
    }
    if (savedTeacherName) {
        teacherNameInput.value = savedTeacherName;
        teacherName = savedTeacherName;
    }
    
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        try {
            ai = new GoogleGenAI({ apiKey: savedApiKey });
            userApiKey = savedApiKey;
            enableApp();
        } catch (error) {
            console.error("Khóa API đã lưu không hợp lệ. Vui lòng nhập khóa mới.", error);
        }
    }

    renderQuiz();

    saveConfigBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        const url = googleScriptUrlInput.value.trim();
        const name = teacherNameInput.value.trim();

        if (url) {
            localStorage.setItem('googleScriptUrl', url);
            googleScriptUrl = url;
        }
        if (name) {
            localStorage.setItem('teacherName', name);
            teacherName = name;
        }

        if (key) {
            try {
                ai = new GoogleGenAI({ apiKey: key });
                userApiKey = key;
                localStorage.setItem('geminiApiKey', key);
                alert('Cấu hình đã được lưu. Bạn có thể bắt đầu tạo đề thi.');
                enableApp();
            } catch (error) {
                ai = null;
                alert('Gemini API Key có vẻ không hợp lệ. Vui lòng kiểm tra lại.');
                console.error(error);
            }
        } else {
            alert('Vui lòng cung cấp Gemini API Key để sử dụng các tính năng AI.');
        }
    });

    btnWorkflowAi.addEventListener('click', () => {
        cardWorkflowChoice.classList.add('hidden');
        workflowAiSteps.classList.remove('hidden');
    });

    btnWorkflowFile.addEventListener('click', () => {
        cardWorkflowChoice.classList.add('hidden');
        workflowFileSteps.classList.remove('hidden');
    });

    knowledgeFileInput.addEventListener('change', async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;

        const originalHTML = knowledgeFileLabel.innerHTML;
        toggleUploadLoading(true, knowledgeFileLabel, originalHTML);
        try {
            let text = '';
            if (file.type === 'text/plain') {
                text = await file.text();
            } else if (file.type.startsWith('image/')) {
                text = await extractTextFromImage(file);
            } else if (file.type === 'application/pdf') {
                text = await extractTextFromPdf(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                text = await extractTextFromDocx(file);
            } else {
                throw new Error('Định dạng tệp không được hỗ trợ.');
            }
            knowledgeBase = text;
            setUploadStatus(uploadStatusAi, `✓ Đã nạp và xử lý tệp: <strong>${file.name}</strong>`);
        } catch (error) {
            console.error("File processing error:", error);
            setUploadStatus(uploadStatusAi, `Lỗi xử lý tệp: ${error.message}`, true);
            knowledgeBase = "";
        } finally {
            toggleUploadLoading(false, knowledgeFileLabel, originalHTML);
            knowledgeFileInput.value = '';
        }
    });

    addRequestBtn.addEventListener('click', () => {
        if (!gradeSelect.value || !chapterSelect.value || !topicSelect.value) {
            alert('Vui lòng chọn đầy đủ Lớp, Chương và Chủ đề.');
            return;
        }
        requestBatch.push({
            grade: gradeSelect.value,
            chapter: chapterSelect.value,
            topic: topicSelect.value,
            type: questionTypeSelect.value,
            count: questionCountInput.value,
            difficulty: difficultySelect.value,
            additionalPrompt: additionalPromptInput.value.trim()
        });
        renderRequestBatch();
        additionalPromptInput.value = '';
    });

    generateButton.addEventListener('click', generateQuizFromBatch);
    aiSuggestionBtn.addEventListener('click', handleAiSuggestionClick);


    analyzeFileInput.addEventListener('change', async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        await analyzeFileForQuiz(file);
    });
    
    finalizeEditsBtn.addEventListener('click', handleFinalizeEdits);
    
    exportHtmlBtn.addEventListener('click', () => {
        exportOptionsModal.classList.remove('hidden');
        exportOptionsModal.classList.add('flex');
    });
    
    createNewExamBtn.addEventListener('click', resetToWorkflowChoice);

    generateStudyGuideBtn.addEventListener('click', handleGenerateStudyGuide);
    saveEditButton.addEventListener('click', handleSaveEdit);
    cancelEditButton.addEventListener('click', () => editModal.classList.add('hidden'));

    // AI Workflow Select listeners
    subjectSelect.addEventListener('change', (e) => initializeSubjectData(e.target.value));
    gradeSelect.addEventListener('change', populateChapters);
    chapterSelect.addEventListener('change', populateTopics);
    topicSelect.addEventListener('change', updateTopicPreview);

    // Tab handler
    resultTabs.addEventListener('click', handleTabClick);

    // Edit Modal Image Handlers
    editUploadImageBtn.addEventListener('click', () => editImageFileInput.click());

    editImageFileInput.addEventListener('change', (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageContainer = document.getElementById('edit-question-image-container');
                if (e.target?.result) {
                    imageContainer.innerHTML = `<img src="${e.target.result}" class="max-h-48 mx-auto rounded-md border" alt="Xem trước ảnh">`;
                    editDeleteImageBtn.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
        editImageFileInput.value = ''; 
    });

    editPasteImageBtn.addEventListener('click', async () => {
        try {
            // Explicitly query for permission status for better error handling
            const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
    
            if (permissionStatus.state === 'denied') {
                alert('Quyền truy cập clipboard đã bị từ chối. Vui lòng kiểm tra cài đặt của trình duyệt.');
                return;
            }
            
            // If granted or prompt, proceed to read from clipboard
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                         const imageContainer = document.getElementById('edit-question-image-container');
                         if (e.target?.result) {
                            imageContainer.innerHTML = `<img src="${e.target.result}" class="max-h-48 mx-auto rounded-md border" alt="Xem trước ảnh">`;
                            editDeleteImageBtn.classList.remove('hidden');
                         }
                    };
                    reader.readAsDataURL(blob);
                    return; // Exit after processing the first image found
                }
            }
            alert('Không tìm thấy hình ảnh trong clipboard.');
        } catch (error) {
            console.error('Lỗi dán ảnh:', error);
            alert('Không thể dán ảnh. Vui lòng kiểm tra quyền truy cập clipboard và đảm bảo trang web được phép truy cập.');
        }
    });

    editDeleteImageBtn.addEventListener('click', () => {
        const imageContainer = document.getElementById('edit-question-image-container');
        imageContainer.innerHTML = '<span class="text-gray-400 text-sm">Chưa có ảnh</span>';
        editDeleteImageBtn.classList.add('hidden');
    });
    
    confirmExportBtn.addEventListener('click', () => {
        const options = {
            timeLimit: parseInt(exportTimeLimitInput.value, 10) || 0,
            retriesAllowed: parseInt(exportRetriesInput.value, 10) || 0,
            showAnswers: exportShowAnswersCheck.checked,
            showExplanation: exportShowExplanationCheck.checked
        };
        const title = exportTitleInput.value.trim() || 'Bài Tập Luyện Tập';
        handleExportHTML(options, title);
        exportOptionsModal.classList.add('hidden');
        exportOptionsModal.classList.remove('flex');
    });

    cancelExportBtn.addEventListener('click', () => {
        exportOptionsModal.classList.add('hidden');
        exportOptionsModal.classList.remove('flex');
    });

    closeStudyGuideBtn.addEventListener('click', () => {
        studyGuideModal.classList.add('hidden');
        studyGuideModal.classList.remove('flex');
        studyGuideContent.innerHTML = ''; 
    });

    copyStudyGuideBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(studyGuideContent.innerText).then(() => {
            alert("Đã sao chép nội dung ôn tập!");
        }).catch(err => {
            console.error("Lỗi khi sao chép:", err);
            alert("Lỗi khi sao chép.");
        });
    });

    // New listeners for interactive objectives
    addObjectivesToPromptBtn.addEventListener('click', handleAddObjectivesToPrompt);
    addNewObjectiveBtn.addEventListener('click', handleSaveCustomObjective);
    downloadJsonBtn.addEventListener('click', handleSaveAndDownloadData);
    saveToLocalBtn.addEventListener('click', handleSaveToLocal);
    revertSubjectDataBtn.addEventListener('click', handleRevertData);
    uploadJsonInput.addEventListener('change', handleUploadJson);
});
