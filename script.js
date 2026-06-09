// 현재 사용자가 보고 있는 단계 번호입니다.
// JavaScript에서는 첫 번째 항목을 0으로 세기 때문에 처음 값은 0입니다.
let currentStep = 0;

// 화면에서 필요한 요소들을 찾아 변수에 저장합니다.
const stepTabs = document.querySelectorAll(".step-tab");
const stepContents = document.querySelectorAll(".step-content");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");
const stepStatus = document.querySelector("#stepStatus");
const progressFill = document.querySelector("#progressFill");
const appNotice = document.querySelector("#appNotice");

// 전체 단계 수를 자동으로 계산합니다.
const totalSteps = stepContents.length;
const minimumEssayLength = 80;

// 다음 버튼에 표시할 문구입니다. 현재 단계에 따라 다음 목적지를 알려 줍니다.
const nextButtonLabels = [
  "피드백 확인하기",
  "평가 결과 확인하기",
  "고쳐쓰기 시작하기",
  "수정 전후 비교하기",
  "모든 단계 완료"
];

/*
  일부 브라우저에서는 보안 설정 때문에 localStorage를 사용할 수 없습니다.
  저장소 오류가 생겨도 앱 전체가 멈추지 않도록 안전하게 읽고 쓰는 함수입니다.
*/
function readBrowserStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("브라우저 저장소에서 내용을 읽지 못했습니다.", error);
    return null;
  }
}

function writeBrowserStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("브라우저 저장소에 내용을 저장하지 못했습니다.", error);
    return false;
  }
}

// 모든 단계에서 함께 사용하는 안내 메시지를 표시하거나 숨깁니다.
function showAppNotice(message, type = "warning") {
  if (!appNotice) {
    return;
  }

  appNotice.textContent = message;
  appNotice.className = `app-notice notice-${type}`;
  appNotice.hidden = false;
}

function clearAppNotice() {
  if (!appNotice) {
    return;
  }

  appNotice.textContent = "";
  appNotice.hidden = true;
}

// 확인이 필요한 입력창을 강조하고 가능한 경우 입력 위치로 이동합니다.
function highlightDraftField(fieldId) {
  const field = document.querySelector(`#${fieldId}`);

  if (!field) {
    return;
  }

  field.classList.add("input-warning");
  field.setAttribute("aria-invalid", "true");
  field.focus?.();
}

/*
  앞으로 이동하기 전에 최소한의 작성 상태를 확인합니다.
  평가를 막기 위한 검사가 아니라, 빈 결과 화면으로 넘어가는 일을 줄이기 위한 안내입니다.
*/
function canMoveForward(targetStep) {
  if (targetStep <= currentStep) {
    return true;
  }

  // 1단계에서 앞으로 이동하려면 본문이 있어야 합니다.
  if (currentStep === 0 && targetStep > 0) {
    const planningText = [
      argumentDraft.topic,
      argumentDraft.position,
      argumentDraft.claim,
      argumentDraft.reasonOne,
      argumentDraft.reasonTwo,
      argumentDraft.counterargument,
      argumentDraft.rebuttal
    ].join("").trim();
    const essay = argumentDraft.essay.trim();

    if (!planningText && !essay) {
      showAppNotice(
        "아직 작성한 내용이 없습니다. 먼저 주제와 생각을 정리한 뒤 논증문 본문을 작성해 주세요."
      );
      highlightDraftField("topic");
      return false;
    }

    if (!essay) {
      showAppNotice("논증문 본문을 작성한 뒤 다음 단계로 이동해 주세요.");
      highlightDraftField("essay");
      return false;
    }

    if (essay.length < minimumEssayLength) {
      showAppNotice(
        `논증문 본문이 아직 ${essay.length}자입니다. 조금 더 작성해 보세요. 약 ${minimumEssayLength}자 이상이면 피드백을 살펴보기 좋습니다.`
      );
      highlightDraftField("essay");
      return false;
    }
  }

  return true;
}

// 버튼과 단계 탭에서 공통으로 사용하는 단계 이동 함수입니다.
function moveToStep(targetStep) {
  const safeTargetStep = Math.max(0, Math.min(totalSteps - 1, targetStep));
  clearAppNotice();

  if (!canMoveForward(safeTargetStep)) {
    return;
  }

  showStep(safeTargetStep);

  if (safeTargetStep === 4 && !revisionDraft.trim()) {
    showAppNotice(
      "먼저 4단계에서 수정본을 작성해 주세요. 현재 화면에서도 원문 정보는 확인할 수 있습니다.",
      "info"
    );
  }
}

// 현재 단계에 맞게 탭, 콘텐츠, 버튼을 새로 표시하는 함수입니다.
function showStep(stepNumber) {
  currentStep = Math.max(0, Math.min(totalSteps - 1, stepNumber));

  // 모든 탭을 확인하면서 현재 단계에만 active 클래스를 붙입니다.
  stepTabs.forEach((tab, index) => {
    const isCurrentStep = index === currentStep;
    tab.classList.toggle("active", isCurrentStep);
    tab.classList.toggle("completed", index < currentStep);

    // 스크린 리더가 현재 단계를 알 수 있도록 aria-current 값을 설정합니다.
    if (isCurrentStep) {
      tab.setAttribute("aria-current", "step");
    } else {
      tab.removeAttribute("aria-current");
    }
  });

  // 모든 콘텐츠 중 현재 단계의 콘텐츠만 보이게 합니다.
  stepContents.forEach((content, index) => {
    content.classList.toggle("active", index === currentStep);
  });

  // 첫 단계에서는 이전 버튼을, 마지막 단계에서는 다음 버튼을 비활성화합니다.
  previousButton.disabled = currentStep === 0;
  nextButton.disabled = currentStep === totalSteps - 1;

  // 사용자가 현재 위치를 쉽게 알 수 있도록 숫자로도 표시합니다.
  stepStatus.textContent = `${currentStep + 1} / ${totalSteps} 단계`;
  nextButton.textContent = nextButtonLabels[currentStep];

  if (progressFill) {
    progressFill.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
  }

  // 2단계로 이동할 때마다 최신 입력 내용을 바탕으로 피드백을 다시 만듭니다.
  if (currentStep === 1) {
    renderFeedback();
  }

  // 3단계로 이동할 때마다 최신 입력 내용을 기준으로 평가를 다시 계산합니다.
  if (currentStep === 2) {
    renderEvaluation();
  }

  // 4단계로 이동하면 원문과 최신 피드백·평가 요약을 다시 표시합니다.
  if (currentStep === 3) {
    renderRevisionScreen();
  }

  // 5단계로 이동하면 원문과 최신 수정본을 다시 비교합니다.
  if (currentStep === 4) {
    renderComparisonScreen();
  }
}

// 이전 단계 버튼을 누르면 현재 단계 번호를 하나 줄입니다.
previousButton.addEventListener("click", () => {
  if (currentStep > 0) {
    moveToStep(currentStep - 1);
  }
});

// 다음 단계 버튼을 누르면 현재 단계 번호를 하나 늘립니다.
nextButton.addEventListener("click", () => {
  if (currentStep < totalSteps - 1) {
    moveToStep(currentStep + 1);
  }
});

// 상단의 단계 탭을 직접 눌러서 원하는 단계로 이동할 수도 있습니다.
stepTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedStep = Number(tab.dataset.step);
    moveToStep(selectedStep);
  });
});

// 앱을 처음 열었을 때 1단계 화면을 올바르게 표시합니다.
showStep(currentStep);

/*
  아래 코드는 1단계 글쓰기 양식의 내용을 관리합니다.
  사용자가 입력한 내용은 먼저 argumentDraft 변수에 저장됩니다.
  "작성 내용 저장" 버튼을 누르면 브라우저의 localStorage에도 저장됩니다.
*/

// 글쓰기 양식에서 사용하는 입력 요소의 id를 한곳에 모아 둡니다.
const draftFieldIds = [
  "topic",
  "position",
  "claim",
  "reasonOne",
  "reasonTwo",
  "counterargument",
  "rebuttal",
  "essay"
];

// 입력 내용을 보관하는 JavaScript 변수입니다.
// 각 항목은 처음에는 빈 문자열로 시작합니다.
let argumentDraft = {
  topic: "",
  position: "",
  claim: "",
  reasonOne: "",
  reasonTwo: "",
  counterargument: "",
  rebuttal: "",
  essay: ""
};

// 저장 버튼, 저장 메시지, 글자 수 표시 요소를 찾아 변수에 담습니다.
const saveDraftButton = document.querySelector("#saveDraftButton");
const saveMessage = document.querySelector("#saveMessage");
const characterCount = document.querySelector("#characterCount");

// 본문 글자 수를 계산해 화면에 표시하는 함수입니다.
function updateCharacterCount() {
  characterCount.textContent = `${argumentDraft.essay.length}자`;
}

// argumentDraft 변수의 내용을 실제 입력창에 채우는 함수입니다.
function fillDraftFields() {
  draftFieldIds.forEach((fieldId) => {
    const field = document.querySelector(`#${fieldId}`);
    field.value = argumentDraft[fieldId];
  });

  updateCharacterCount();
}

// 이전에 저장한 내용이 있으면 localStorage에서 불러옵니다.
function loadSavedDraft() {
  const savedDraft = readBrowserStorage("naegeuldapgeArgumentDraft");

  // 저장된 내용이 없으면 빈 입력창을 그대로 사용합니다.
  if (!savedDraft) {
    return;
  }

  try {
    // JSON 문자열을 다시 JavaScript 객체로 바꿉니다.
    const parsedDraft = JSON.parse(savedDraft);

    // 예상하지 못한 저장 데이터가 있어도 문자열 값만 복원합니다.
    draftFieldIds.forEach((fieldId) => {
      if (typeof parsedDraft[fieldId] === "string") {
        argumentDraft[fieldId] = parsedDraft[fieldId];
      }
    });

    fillDraftFields();
  } catch (error) {
    // 저장 데이터가 손상되어도 앱이 멈추지 않도록 콘솔에만 알립니다.
    console.error("저장된 작성 내용을 불러오지 못했습니다.", error);
  }
}

// 각 입력창의 내용이 바뀔 때마다 argumentDraft 변수도 바로 업데이트합니다.
draftFieldIds.forEach((fieldId) => {
  const field = document.querySelector(`#${fieldId}`);

  field.addEventListener("input", (event) => {
    argumentDraft[fieldId] = event.target.value;
    field.classList.remove("input-warning");
    field.removeAttribute("aria-invalid");
    clearAppNotice();

    // 본문이 바뀐 경우에만 글자 수를 새로 계산합니다.
    if (fieldId === "essay") {
      updateCharacterCount();
    }

    // 입력할 때마다 임시 저장하여 단계 이동이나 새로고침 뒤에도 내용을 보호합니다.
    writeBrowserStorage(
      "naegeuldapgeArgumentDraft",
      JSON.stringify(argumentDraft)
    );
  });
});

// 저장 버튼을 누르면 현재 작성 내용을 브라우저에 저장하고 메시지를 보여 줍니다.
saveDraftButton.addEventListener("click", () => {
  const savedSuccessfully = writeBrowserStorage(
    "naegeuldapgeArgumentDraft",
    JSON.stringify(argumentDraft)
  );

  saveMessage.textContent = savedSuccessfully
    ? "작성 내용을 저장했습니다."
    : "브라우저 저장 기능을 사용할 수 없습니다. 현재 화면에서는 내용이 유지됩니다.";

  // 3초 뒤 확인 메시지를 지워 화면을 깔끔하게 유지합니다.
  window.setTimeout(() => {
    saveMessage.textContent = "";
  }, 3000);
});

// 페이지를 처음 열 때 이전에 저장한 작성 내용이 있는지 확인합니다.
loadSavedDraft();

/*
  아래 코드는 2단계 피드백 화면을 만듭니다.
  실제 AI를 사용하는 대신, 글 안에 특정 내용이나 표현이 있는지 확인하는
  간단한 규칙을 사용합니다. 따라서 결과는 정답이 아니라 점검을 돕는 참고 자료입니다.
*/

// 2단계에서 값을 표시할 요소들을 찾습니다.
const feedbackSummaryElements = {
  topic: document.querySelector("#summaryTopic"),
  position: document.querySelector("#summaryPosition"),
  claim: document.querySelector("#summaryClaim"),
  reasonOne: document.querySelector("#summaryReasonOne"),
  reasonTwo: document.querySelector("#summaryReasonTwo"),
  counterargument: document.querySelector("#summaryCounterargument"),
  rebuttal: document.querySelector("#summaryRebuttal")
};

const feedbackCharacterCount = document.querySelector("#feedbackCharacterCount");
const feedbackSentenceCount = document.querySelector("#feedbackSentenceCount");
const feedbackParagraphCount = document.querySelector("#feedbackParagraphCount");
const structureFeedbackList = document.querySelector("#structureFeedbackList");
const expressionFeedbackList = document.querySelector("#expressionFeedbackList");
const aiExpressionFeedbackList = document.querySelector("#aiExpressionFeedbackList");
const aiRiskBadge = document.querySelector("#aiRiskBadge");
const aiRiskLabel = document.querySelector("#aiRiskLabel");
const aiRiskDescription = document.querySelector("#aiRiskDescription");
const aiFoundExpressionsList = document.querySelector("#aiFoundExpressionsList");
const aiSentenceDiagnosisList = document.querySelector("#aiSentenceDiagnosisList");
const aiRevisionDirectionsList = document.querySelector("#aiRevisionDirectionsList");
const goodPointsList = document.querySelector("#goodPointsList");
const improvementPointsList = document.querySelector("#improvementPointsList");
const revisionSuggestionsList = document.querySelector("#revisionSuggestionsList");
const overallFeedback = document.querySelector("#overallFeedback");
const refreshFeedbackButton = document.querySelector("#refreshFeedbackButton");

// 글 안에 특정 표현이 몇 번 들어 있는지 세는 함수입니다.
function countExpression(text, expression) {
  return text.split(expression).length - 1;
}

// 본문을 문장 단위로 나누고, 내용이 있는 문장만 돌려줍니다.
function getSentences(text) {
  return text
    .split(/[.!?。]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

// 빈 줄을 기준으로 본문을 문단 단위로 나눕니다.
function getParagraphs(text) {
  if (!text.trim()) {
    return [];
  }

  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0);
}

/*
  AI 글과 유사하게 보일 수 있는 표현을 진단하기 위한 공통 규칙입니다.
  이 목록과 diagnoseAiStyle 함수는 원문과 수정본 모두에 사용할 수 있습니다.
*/
const aiStylePhraseRules = [
  {
    category: "상투적 도입 표현",
    expressions: [
      "현대 사회에서",
      "오늘날",
      "최근 들어",
      "많은 사람들이",
      "중요한 문제이다",
      "사회적으로 큰 의미가 있다"
    ],
    explanation: "여러 논증문에서 자주 사용되어 글의 시작이 익숙하고 획일적으로 느껴질 수 있습니다.",
    direction: "이 문제가 실제로 드러나는 구체적인 상황이나 직접 관찰한 장면으로 시작할 수 있을까요?"
  },
  {
    category: "기계적인 연결 표현",
    expressions: [
      "첫째",
      "둘째",
      "셋째",
      "결론적으로",
      "이를 통해",
      "따라서",
      "또한",
      "나아가"
    ],
    explanation: "연결 표현이 반복되면 내용보다 정해진 글쓰기 틀이 먼저 보일 수 있습니다.",
    direction: "접속어를 하나 지워도 문장 순서만으로 생각의 관계가 이어지는지 읽어 보세요."
  },
  {
    category: "지나치게 포괄적인 표현",
    expressions: [
      "다각도로 고려해야 한다",
      "다양한 측면에서 살펴볼 필요가 있다",
      "긍정적인 영향을 미친다",
      "부정적인 영향을 미친다",
      "문제를 해결해야 한다",
      "바람직한 방향으로 나아가야 한다"
    ],
    explanation: "무엇이 어떻게 달라지는지 구체적으로 밝히지 않아 필자의 판단이 흐려질 수 있습니다.",
    direction: "영향을 받는 사람, 실제 변화, 판단의 기준 중 하나를 구체적으로 밝혀 볼 수 있을까요?"
  },
  {
    category: "반복될 수 있는 종결 표현",
    expressions: [
      "할 수 있다",
      "해야 한다",
      "필요가 있다",
      "것이다",
      "라고 생각한다"
    ],
    explanation: "같은 끝맺음이 반복되면 문장이 조심스럽지만 단조롭게 느껴질 수 있습니다.",
    direction: "반복되는 끝맺음 중 일부에 필자의 판단, 이유, 관찰 결과를 더 직접적으로 드러낼 수 있을까요?"
  }
];

const aiStylePerspectiveExpressions = [
  "나는",
  "내가",
  "나의",
  "필자는",
  "내 생각",
  "내 경험으로는",
  "내가 본",
  "나는 본다",
  "나는 판단한다"
];

const aiStyleConcreteExpressions = [
  "예를 들어",
  "실제로",
  "내 경험으로는",
  "구체적으로",
  "한 사례로",
  "수업에서",
  "학교에서",
  "일상에서"
];

const aiStyleClaimExpressions = [
  "생각한다",
  "주장한다",
  "필요하다",
  "해야 한다",
  "동의한다",
  "반대한다",
  "바람직하다",
  "라고 본다",
  "판단한다"
];

// 문장 부호를 포함한 문장 단위로 나누어 문장별 진단에 사용합니다.
function getSentencesWithPunctuation(text) {
  return (text.match(/[^.!?。]+[.!?。]?/g) || [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

// 표현 목록이 글 안에서 총 몇 번 사용되었는지 셉니다.
function countExpressionsInList(text, expressions) {
  return expressions.reduce(
    (total, expression) => total + countExpression(text, expression),
    0
  );
}

/*
  한 편의 글을 받아 AI 글과 유사하게 보일 가능성을 진단합니다.
  결과에는 위험도, 발견 표현, 문장별 이유, 직접 고치기 위한 질문이 포함됩니다.
*/
function diagnoseAiStyle(text) {
  const trimmedText = text.trim();
  const sentences = getSentencesWithPunctuation(trimmedText);
  const findings = [];
  const weaknesses = [];
  const directions = [];
  let riskScore = 0;

  aiStylePhraseRules.forEach((rule) => {
    rule.expressions.forEach((expression) => {
      const count = countExpression(trimmedText, expression);

      if (count === 0) {
        return;
      }

      findings.push({
        expression,
        count,
        category: rule.category,
        explanation: rule.explanation,
        direction: rule.direction
      });

      // 상투적 도입과 포괄적 표현은 한 번만 사용되어도 위험 점수를 더합니다.
      if (
        rule.category === "상투적 도입 표현" ||
        rule.category === "지나치게 포괄적인 표현"
      ) {
        riskScore += count * 2;
      }

      // 연결·종결 표현은 반복될 때 위험 점수를 더 크게 반영합니다.
      if (
        rule.category === "기계적인 연결 표현" ||
        rule.category === "반복될 수 있는 종결 표현"
      ) {
        riskScore += count >= 2 ? count : 0;
      }

      if (!directions.includes(rule.direction)) {
        directions.push(rule.direction);
      }
    });
  });

  const perspectiveCount = countExpressionsInList(
    trimmedText,
    aiStylePerspectiveExpressions
  );
  const concreteCount =
    countExpressionsInList(trimmedText, aiStyleConcreteExpressions) +
    (/\d/.test(trimmedText) ? 1 : 0);
  const claimCount = countExpressionsInList(trimmedText, aiStyleClaimExpressions);
  const hasMechanicalSequence =
    ["첫째", "둘째", "셋째"].filter((word) => trimmedText.includes(word)).length >= 3;

  if (hasMechanicalSequence) {
    riskScore += 2;
    directions.push(
      "‘첫째, 둘째, 셋째’의 순서를 유지해야 하는 이유가 있는지, 내용의 관계에 따라 다른 방식으로 연결할 수 있는지 살펴보세요."
    );
  }

  if (trimmedText && perspectiveCount === 0) {
    riskScore += 2;
    weaknesses.push({
      label: "필자 개입 표현",
      explanation: "“나는”, “내가”, “필자는”, “내 경험으로는” 같은 표현이 없어 필자의 관점이 약하게 느껴질 수 있습니다."
    });
    directions.push(
      "정보를 설명한 뒤 ‘나는 왜 이 점을 중요하게 보는가?’에 답하는 문장을 한 문장 덧붙여 보세요."
    );
  }

  if (trimmedText && concreteCount === 0) {
    riskScore += 2;
    weaknesses.push({
      label: "구체적인 사례 표현",
      explanation: "구체적인 상황이나 경험을 보여 주는 표현이 없어 일반론처럼 느껴질 수 있습니다."
    });
    directions.push(
      "일반적인 설명 하나를 실제 경험, 학교나 수업의 상황, 숫자 자료 중 하나로 구체화해 보세요."
    );
  }

  if (trimmedText && claimCount === 0) {
    riskScore += 1;
    weaknesses.push({
      label: "필자의 판단 표현",
      explanation: "주장이나 판단을 보여 주는 표현이 적어 논증문보다 설명문처럼 느껴질 수 있습니다."
    });
    directions.push(
      "설명에 머물지 않도록, 이 문제에 대해 자신이 내리는 판단을 한 문장으로 분명히 밝혀 보세요."
    );
  }

  if (sentences.length >= 3 && concreteCount === 0) {
    riskScore += 1;
    weaknesses.push({
      label: "일반론 반복 가능성",
      explanation: "여러 문장이 이어지지만 구체적인 사례가 없어 일반적인 설명이 반복되는 인상을 줄 수 있습니다."
    });
  }

  const sentenceDiagnostics = sentences
    .map((sentence) => {
      const sentenceFindings = findings.filter((finding) =>
        sentence.includes(finding.expression)
      );

      if (sentenceFindings.length === 0) {
        return null;
      }

      const expressions = sentenceFindings
        .map((finding) => `“${finding.expression}”`)
        .join(", ");
      const categories = [...new Set(sentenceFindings.map((finding) => finding.category))]
        .join(", ");

      return {
        sentence,
        explanation:
          `${expressions} 표현 때문에 ${categories}의 특징이 보입니다. ` +
          sentenceFindings[0].explanation
      };
    })
    .filter(Boolean);

  let riskLevel = "낮음";
  let riskClass = "risk-low";
  let riskDescription =
    "현재 규칙에서는 AI 글과 유사하게 보일 가능성이 높지 않습니다. 그래도 자신의 경험과 판단이 충분히 드러나는지 마지막으로 확인해 보세요.";

  if (riskScore >= 9) {
    riskLevel = "높음";
    riskClass = "risk-high";
    riskDescription =
      "익숙한 표현과 일반적인 설명이 여러 곳에서 보여 AI 글과 유사하게 보일 가능성이 있습니다. 이는 글이 나쁘다는 뜻이 아닙니다. 표시된 부분 중 한두 곳부터 자신의 상황과 판단으로 구체화해 보세요.";
  } else if (riskScore >= 4) {
    riskLevel = "보통";
    riskClass = "risk-medium";
    riskDescription =
      "일부 표현이 익숙한 논증문 틀처럼 느껴질 수 있습니다. 표시된 표현이 꼭 필요한지 확인하고, 자신의 경험이나 판단을 한두 문장 더 드러내 보세요.";
  }

  if (!trimmedText) {
    riskDescription =
      "아직 진단할 본문이 없습니다. 글을 작성하면 표현별 횟수와 문장별 안내를 확인할 수 있습니다.";
  }

  return {
    riskLevel,
    riskClass,
    riskScore,
    riskDescription,
    findings,
    weaknesses,
    sentenceDiagnostics,
    directions: [...new Set(directions)],
    perspectiveCount,
    concreteCount,
    claimCount,
    flaggedExpressionCount: findings.reduce(
      (total, finding) => total + finding.count,
      0
    )
  };
}

// 피드백 문장 배열을 HTML 목록에 안전하게 표시합니다.
// innerHTML 대신 textContent를 사용해 사용자의 입력이 코드로 실행되지 않게 합니다.
function renderFeedbackList(listElement, items) {
  listElement.replaceChildren();

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item.text;
    listItem.className = item.type || "";
    listElement.appendChild(listItem);
  });
}

// 1단계의 입력 내용과 본문을 규칙에 따라 분석합니다.
function analyzeDraft() {
  const essay = argumentDraft.essay.trim();
  const sentences = getSentences(essay);
  const paragraphs = getParagraphs(essay);
  const allPlanningText = [
    argumentDraft.claim,
    argumentDraft.reasonOne,
    argumentDraft.reasonTwo,
    argumentDraft.counterargument,
    argumentDraft.rebuttal
  ].join(" ");
  const combinedText = `${allPlanningText} ${essay}`;

  const hasClaim = argumentDraft.claim.trim().length >= 10;
  const hasReasonOne = argumentDraft.reasonOne.trim().length >= 10;
  const hasReasonTwo = argumentDraft.reasonTwo.trim().length >= 10;
  const hasTwoReasons = hasReasonOne && hasReasonTwo;
  const hasCounterargument = argumentDraft.counterargument.trim().length >= 10;
  const hasRebuttal = argumentDraft.rebuttal.trim().length >= 10;
  const hasConcreteDetail =
    /\d|예를 들어|예컨대|실제로|사례|경험|조사|통계|자료|연구/.test(combinedText);
  const hasPersonalView =
    /나는|내가|나의|내 생각|판단|본다|생각한다|주장한다|동의한다|반대한다/.test(combinedText);
  const flowExpressions =
    /왜냐하면|예를 들어|하지만|반면|따라서|그러므로|그럼에도|때문이다/.test(essay);

  const structure = [];
  const expression = [];
  const aiExpression = [];
  const good = [];
  const improve = [];
  const suggestions = [];

  // 논증 구조 피드백을 만듭니다.
  if (hasClaim) {
    structure.push({ type: "positive", text: "핵심 주장이 한 문장 이상으로 제시되어 있습니다." });
    good.push({ type: "positive", text: "글에서 말하려는 핵심 주장을 미리 정리했습니다." });
  } else {
    structure.push({ type: "warning", text: "핵심 주장이 짧거나 비어 있어 글의 중심을 파악하기 어렵습니다." });
    improve.push({ type: "warning", text: "핵심 주장을 더 분명하게 정리할 필요가 있습니다." });
    suggestions.push({ text: "핵심 주장을 ‘나는 왜 이 입장을 지지하는가?’라는 질문에 답하는 한 문장으로 써 보세요." });
  }

  if (hasTwoReasons) {
    structure.push({ type: "positive", text: "핵심 주장을 뒷받침하는 두 가지 근거가 마련되어 있습니다." });
    good.push({ type: "positive", text: "서로 다른 두 가지 근거를 준비했습니다." });
  } else {
    structure.push({ type: "warning", text: "근거가 두 가지 모두 충분히 작성되지 않았습니다." });
    improve.push({ type: "warning", text: "주장을 뒷받침하는 근거를 더 충분히 마련할 수 있습니다." });
    suggestions.push({ text: "비어 있거나 짧은 근거에 이유와 결과를 함께 적어 보세요." });
  }

  if (hasCounterargument && hasRebuttal) {
    structure.push({ type: "positive", text: "예상 반론과 그에 대한 재반박이 모두 준비되어 있습니다." });
    good.push({ type: "positive", text: "다른 입장을 고려하고 다시 설명하려는 구조가 보입니다." });
  } else {
    structure.push({ type: "warning", text: "예상 반론이나 재반박 중 보완할 부분이 있습니다." });
    improve.push({ type: "warning", text: "다른 입장의 이유와 그에 대한 답을 더 살펴볼 수 있습니다." });
    suggestions.push({ text: "내 주장에 동의하지 않는 사람이 할 질문을 하나 떠올린 뒤 직접 답해 보세요." });
  }

  if (sentences.length >= 3 && flowExpressions) {
    structure.push({ type: "positive", text: "본문에 생각을 연결하는 표현이 있어 논증 흐름을 따라가기 쉽습니다." });
  } else {
    structure.push({ type: "warning", text: "본문에서 주장과 근거가 어떻게 이어지는지 조금 더 분명히 보여 줄 수 있습니다." });
    improve.push({ type: "warning", text: "주장과 근거 사이의 연결이 아직 충분히 드러나지 않습니다." });
    suggestions.push({ text: "각 근거 뒤에 ‘이 근거가 왜 내 주장을 뒷받침하는가’를 한 문장으로 설명해 보세요." });
  }

  // 문장 표현 피드백을 만듭니다.
  if (hasConcreteDetail) {
    expression.push({ type: "positive", text: "숫자, 사례, 경험 또는 자료를 활용한 구체적인 내용이 보입니다." });
    good.push({ type: "positive", text: "글의 내용을 구체적으로 보여 주는 요소가 있습니다." });
  } else {
    expression.push({ type: "warning", text: "내용이 다소 일반적으로 느껴질 수 있습니다. 구체적인 상황이나 사례를 찾아보세요." });
    improve.push({ type: "warning", text: "근거가 다소 일반적이어서 독자가 실제 상황을 떠올리기 어렵습니다." });
    suggestions.push({ text: "근거 1이나 근거 2에 직접 본 사례, 관찰한 상황, 숫자 자료 중 하나를 추가해 보세요." });
  }

  if (hasPersonalView) {
    expression.push({ type: "positive", text: "필자의 판단이나 관점을 보여 주는 표현이 있습니다." });
  } else {
    expression.push({ type: "warning", text: "필자의 판단이 뚜렷하게 드러나는 표현이 적습니다." });
    improve.push({ type: "warning", text: "정보 설명에 더해 내가 어떻게 판단하는지를 보여 줄 필요가 있습니다." });
    suggestions.push({ text: "근거를 설명한 뒤 ‘나는 이 점에서 …라고 본다’처럼 자신의 판단을 덧붙여 보세요." });
  }

  const connectorWords = ["따라서", "그러므로", "하지만", "또한", "그리고", "결론적으로", "이를 통해"];
  const repeatedConnectors = connectorWords
    .map((word) => ({ word, count: countExpression(essay, word) }))
    .filter((item) => item.count >= 3);

  if (repeatedConnectors.length > 0) {
    const connectorNames = repeatedConnectors
      .map((item) => `“${item.word}” ${item.count}회`)
      .join(", ");
    expression.push({ type: "warning", text: `같은 접속어가 반복됩니다: ${connectorNames}.` });
    improve.push({ type: "warning", text: "같은 접속어의 반복 때문에 문장 흐름이 기계적으로 느껴질 수 있습니다." });
    suggestions.push({ text: "반복된 접속어 한두 개를 지우고, 문장 순서만으로도 뜻이 이어지는지 읽어 보세요." });
  } else {
    expression.push({ type: "positive", text: "지나치게 반복되는 접속어는 발견되지 않았습니다." });
  }

  // 공통 AI 문체 진단 함수를 사용해 원문의 위험도와 표현을 살펴봅니다.
  const aiDiagnosis = diagnoseAiStyle(essay);

  aiExpression.push({
    type: aiDiagnosis.riskLevel === "낮음" ? "positive" : "warning",
    text: `AI 글과 유사하게 보일 가능성: ${aiDiagnosis.riskLevel}. ${aiDiagnosis.riskDescription}`
  });

  aiDiagnosis.findings.slice(0, 3).forEach((finding) => {
    aiExpression.push({
      type: "warning",
      text: `“${finding.expression}” ${finding.count}회: ${finding.explanation}`
    });
  });

  if (aiDiagnosis.riskLevel === "낮음") {
    aiExpression.push({
      type: "positive",
      text: "현재 규칙에서 눈에 띄는 획일적 표현 반복은 많지 않습니다."
    });
    good.push({ type: "positive", text: "자주 쓰이는 상투적 표현의 반복이 많지 않습니다." });
  } else {
    improve.push({
      type: "warning",
      text: "일부 표현이 익숙한 논증문 틀처럼 느껴져 AI 글과 유사하게 보일 가능성이 있습니다."
    });
    suggestions.push({
      text: aiDiagnosis.directions[0] ||
        "표시된 표현을 무조건 지우기보다, 그 자리에 내 경험이나 구체적인 판단을 넣을 수 있는지 살펴보세요."
    });
  }

  // 아무 내용도 작성하지 않은 경우 가장 먼저 해야 할 일을 분명히 안내합니다.
  if (!essay) {
    improve.unshift({ type: "warning", text: "아직 논증문 본문이 작성되지 않았습니다." });
    suggestions.unshift({ text: "1단계로 돌아가 정리한 주장과 근거를 연결해 본문을 먼저 작성해 보세요." });
  }

  // 종합 안내 문장은 현재 준비 상태에 따라 다르게 만듭니다.
  let overallMessage =
    "현재 글은 핵심 주장이 제시되어 있지만, 근거가 다소 일반적입니다. 근거 1이나 근거 2에 구체적인 상황이나 사례를 추가하면 더 자연스러운 논증문이 될 수 있습니다.";

  if (!hasClaim) {
    overallMessage =
      "현재 글은 중심 주장을 먼저 분명하게 정리하면 논증의 방향이 더 선명해질 수 있습니다. 내가 가장 설득하고 싶은 내용을 한 문장으로 적어 보세요.";
  } else if (hasTwoReasons && hasConcreteDetail && hasCounterargument && hasRebuttal) {
    overallMessage =
      "주장, 근거, 반론과 재반박이 고르게 준비되어 있습니다. 이제 각 근거가 핵심 주장과 어떻게 연결되는지 확인하며 자신의 판단이 드러나는 문장으로 다듬어 보세요.";
  }

  return {
    statistics: {
      characters: argumentDraft.essay.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length
    },
    structure,
    expression,
    aiExpression,
    aiDiagnosis,
    good,
    improve,
    suggestions,
    overallMessage
  };
}

// 분석 결과를 2단계 화면의 각 영역에 표시합니다.
function renderFeedback() {
  Object.entries(feedbackSummaryElements).forEach(([fieldId, element]) => {
    element.textContent = argumentDraft[fieldId].trim() || "아직 작성하지 않았습니다.";
  });

  const result = analyzeDraft();

  feedbackCharacterCount.textContent = result.statistics.characters;
  feedbackSentenceCount.textContent = result.statistics.sentences;
  feedbackParagraphCount.textContent = result.statistics.paragraphs;
  overallFeedback.textContent = result.overallMessage;
  aiRiskLabel.textContent = result.aiDiagnosis.riskLevel;
  aiRiskBadge.className = `ai-risk-badge ${result.aiDiagnosis.riskClass}`;
  aiRiskDescription.textContent = result.aiDiagnosis.riskDescription;

  const foundExpressionItems = [
    ...result.aiDiagnosis.findings.map((finding) => ({
      type: "warning",
      text:
        `“${finding.expression}” ${finding.count}회 · ${finding.category}\n` +
        finding.explanation
    })),
    ...result.aiDiagnosis.weaknesses.map((weakness) => ({
      type: "warning",
      text: `${weakness.label} 점검 · ${weakness.explanation}`
    }))
  ];

  if (foundExpressionItems.length === 0) {
    foundExpressionItems.push({
        type: "positive",
        text: "현재 규칙에서 발견된 상투적·기계적·포괄적 표현이 없습니다."
    });
  }

  const sentenceDiagnosisItems = result.aiDiagnosis.sentenceDiagnostics.length
    ? result.aiDiagnosis.sentenceDiagnostics.map((diagnosis) => ({
        type: "warning",
        text: `“${diagnosis.sentence}”\n${diagnosis.explanation}`
      }))
    : [{
        type: "positive",
        text: "특정 표현 때문에 따로 살펴볼 문장은 발견되지 않았습니다."
      }];

  const revisionDirectionItems = result.aiDiagnosis.directions.length
    ? result.aiDiagnosis.directions.map((direction) => ({ text: direction }))
    : [{
        type: "positive",
        text: "자신의 경험과 판단이 충분히 드러나는지 마지막으로 소리 내어 읽어 보세요."
      }];

  renderFeedbackList(structureFeedbackList, result.structure);
  renderFeedbackList(expressionFeedbackList, result.expression);
  renderFeedbackList(aiExpressionFeedbackList, result.aiExpression);
  renderFeedbackList(aiFoundExpressionsList, foundExpressionItems);
  renderFeedbackList(aiSentenceDiagnosisList, sentenceDiagnosisItems);
  renderFeedbackList(aiRevisionDirectionsList, revisionDirectionItems);
  renderFeedbackList(goodPointsList, result.good);
  renderFeedbackList(improvementPointsList, result.improve);
  renderFeedbackList(revisionSuggestionsList, result.suggestions);
}

// 버튼을 누르면 현재 입력 내용을 기준으로 피드백을 즉시 다시 만듭니다.
refreshFeedbackButton.addEventListener("click", renderFeedback);

/*
  아래 코드는 3단계 평가 결과를 만듭니다.
  각 항목은 간단한 규칙으로 1점부터 5점 사이에서 계산됩니다.
  이 점수는 성적이 아니라 고쳐쓰기 방향을 찾기 위한 학습용 신호입니다.
*/

const evaluationAverage = document.querySelector("#evaluationAverage");
const evaluationSummaryText = document.querySelector("#evaluationSummaryText");
const evaluationCards = document.querySelector("#evaluationCards");
const strongestAreaTitle = document.querySelector("#strongestAreaTitle");
const strongestAreaText = document.querySelector("#strongestAreaText");
const priorityAreaTitle = document.querySelector("#priorityAreaTitle");
const priorityAreaText = document.querySelector("#priorityAreaText");
const goToRevisionButton = document.querySelector("#goToRevisionButton");

// 나중 단계에서도 평가 결과를 사용할 수 있도록 변수에 보관합니다.
let evaluationResult = [];

// 계산한 점수가 반드시 1~5점 사이에 있도록 정리합니다.
function clampScore(score) {
  return Math.max(1, Math.min(5, score));
}

// 여러 표현 중 본문에 들어 있는 표현의 수를 셉니다.
function countMatchedExpressions(text, expressions) {
  return expressions.filter((expression) => text.includes(expression)).length;
}

// 같은 접속어가 세 번 이상 반복되었는지 확인합니다.
function hasRepeatedConnector(text) {
  const connectors = [
    "따라서",
    "그러므로",
    "하지만",
    "또한",
    "그리고",
    "결론적으로",
    "이를 통해"
  ];

  return connectors.some((connector) => countExpression(text, connector) >= 3);
}

// 문장 끝부분이 지나치게 같은지 간단히 확인합니다.
function hasRepeatedSentenceEnding(sentences) {
  if (sentences.length < 3) {
    return false;
  }

  const endingCounts = {};

  sentences.forEach((sentence) => {
    // 문장 끝의 마지막 다섯 글자를 비교용 값으로 사용합니다.
    const ending = sentence.replace(/\s+/g, " ").slice(-5);
    endingCounts[ending] = (endingCounts[ending] || 0) + 1;
  });

  const largestCount = Math.max(...Object.values(endingCounts));
  return largestCount / sentences.length >= 0.6;
}

// 점수에 따라 칭찬이나 구체적인 보완 문장을 선택합니다.
function getEvaluationMessage(item, score) {
  if (score >= 4) {
    return item.praise;
  }

  if (score <= 2) {
    return item.suggestion;
  }

  return item.middle;
}

// 7가지 기준으로 현재 글의 점수를 계산합니다.
function evaluateDraft() {
  const essay = argumentDraft.essay.trim();
  const sentences = getSentences(essay);
  const paragraphs = getParagraphs(essay);
  const combinedText = [
    argumentDraft.claim,
    argumentDraft.reasonOne,
    argumentDraft.reasonTwo,
    argumentDraft.counterargument,
    argumentDraft.rebuttal,
    essay
  ].join(" ");

  const sentenceLengths = sentences.map((sentence) => sentence.length);
  const averageSentenceLength = sentenceLengths.length
    ? sentenceLengths.reduce((sum, length) => sum + length, 0) / sentenceLengths.length
    : 0;
  const sentenceLengthRange = sentenceLengths.length
    ? Math.max(...sentenceLengths) - Math.min(...sentenceLengths)
    : 0;
  const awkwardLengthCount = sentenceLengths.filter(
    (length) => length < 10 || length > 100
  ).length;

  // 1. 주장 명확성
  let claimScore = 1;
  if (argumentDraft.claim.trim()) claimScore += 2;
  if (argumentDraft.position.trim()) claimScore += 1;
  if (/생각한다|주장한다|필요하다|해야 한다|바람직하다/.test(essay)) claimScore += 1;

  // 2. 근거 타당성
  let validityScore = 1;
  if (argumentDraft.reasonOne.trim()) validityScore += 1;
  if (argumentDraft.reasonTwo.trim()) validityScore += 1;
  if (/왜냐하면|그 이유는|때문에|때문이다/.test(essay)) validityScore += 1;
  if (
    argumentDraft.reasonOne.trim().length >= 20 &&
    argumentDraft.reasonTwo.trim().length >= 20
  ) validityScore += 1;

  // 3. 근거 구체성
  let specificityScore = 1;
  const concreteExpressions = [
    "예를 들어",
    "실제로",
    "내 경험",
    "사례",
    "조사",
    "통계",
    "연구"
  ];
  specificityScore += Math.min(
    3,
    countMatchedExpressions(combinedText, concreteExpressions)
  );
  if (/\d/.test(combinedText)) specificityScore += 1;

  // 4. 반론 고려
  let counterargumentScore = 1;
  if (argumentDraft.counterargument.trim()) counterargumentScore += 1;
  if (argumentDraft.rebuttal.trim()) counterargumentScore += 1;
  if (/물론|반면|그러나|하지만/.test(essay)) counterargumentScore += 1;
  if (
    argumentDraft.counterargument.trim().length >= 20 &&
    argumentDraft.rebuttal.trim().length >= 20
  ) counterargumentScore += 1;

  // 5. 조직과 흐름
  let organizationScore = 1;
  if (paragraphs.length >= 2) organizationScore += 1;
  if (paragraphs.length >= 3) organizationScore += 1;
  if (/첫째|둘째|따라서|결론적으로|왜냐하면|하지만/.test(essay)) organizationScore += 1;
  if (sentences.length >= 4) organizationScore += 1;
  if (hasRepeatedConnector(essay)) organizationScore -= 1;

  // 6. 문장 자연스러움
  let naturalnessScore = 2;
  if (sentences.length >= 3) naturalnessScore += 1;
  if (averageSentenceLength >= 15 && averageSentenceLength <= 80) naturalnessScore += 1;
  if (sentenceLengthRange >= 10) naturalnessScore += 1;
  if (sentences.length > 0 && awkwardLengthCount / sentences.length >= 0.4) naturalnessScore -= 1;
  if (hasRepeatedSentenceEnding(sentences)) naturalnessScore -= 1;

  // 7. AI스러운 표현 가능성: 공통 진단 위험 점수가 낮을수록 높은 점수를 줍니다.
  const aiStyleDiagnosis = diagnoseAiStyle(essay);
  const aiStyleScore = essay
    ? clampScore(5 - Math.floor(aiStyleDiagnosis.riskScore / 3))
    : 1;

  // 각 항목은 점수와 점수별 안내 문장을 함께 가집니다.
  const items = [
    {
      name: "주장 명확성",
      score: clampScore(claimScore),
      praise: "핵심 주장과 입장이 비교적 분명하게 드러납니다. 이 중심을 유지해 보세요.",
      middle: "주장은 보이지만 본문에서 한 번 더 분명히 밝혀 주면 방향이 선명해집니다.",
      suggestion: "핵심 주장을 한 문장으로 정리하고, 본문에도 ‘나는 …해야 한다고 생각한다’처럼 밝혀 보세요."
    },
    {
      name: "근거 타당성",
      score: clampScore(validityScore),
      praise: "두 근거와 이유 설명이 주장을 안정적으로 받쳐 주고 있습니다.",
      middle: "근거는 마련되어 있습니다. 각 근거가 왜 주장을 뒷받침하는지 한 문장씩 덧붙여 보세요.",
      suggestion: "근거 1과 근거 2를 채우고, 본문에서 ‘왜냐하면’이나 ‘그 이유는’ 뒤에 이유를 설명해 보세요."
    },
    {
      name: "근거 구체성",
      score: clampScore(specificityScore),
      praise: "사례나 자료가 있어 독자가 근거를 구체적으로 이해하기 좋습니다.",
      middle: "근거의 방향은 좋습니다. 실제 상황이나 숫자 자료를 하나 더 넣어 보세요.",
      suggestion: "근거 하나를 골라 ‘예를 들어’ 뒤에 실제 사례, 경험 또는 숫자를 적어 보세요."
    },
    {
      name: "반론 고려",
      score: clampScore(counterargumentScore),
      praise: "다른 입장과 그에 대한 답을 함께 고려해 논증이 균형 있게 보입니다.",
      middle: "반론을 고려하고 있습니다. 재반박에서 내 주장이 여전히 타당한 이유를 더 설명해 보세요.",
      suggestion: "내 주장에 반대하는 사람이 할 질문을 하나 쓰고, 그 질문에 직접 답해 보세요."
    },
    {
      name: "조직과 흐름",
      score: clampScore(organizationScore),
      praise: "문단과 연결 표현이 글의 흐름을 이해하는 데 도움을 줍니다.",
      middle: "글의 순서는 보입니다. 주장, 근거, 반론이 바뀌는 지점에서 문단을 나누어 보세요.",
      suggestion: "주장, 근거, 반론을 각각 문단으로 나누고 문단 사이의 관계를 한 문장으로 연결해 보세요."
    },
    {
      name: "문장 자연스러움",
      score: clampScore(naturalnessScore),
      praise: "문장 길이에 변화가 있고 지나치게 짧거나 긴 문장이 많지 않습니다.",
      middle: "전반적으로 읽을 수 있지만 일부 문장의 길이나 끝맺음을 바꾸면 더 자연스러워집니다.",
      suggestion: "글을 소리 내어 읽고, 숨이 차는 긴 문장은 나누며 같은 끝맺음이 반복되는지도 확인해 보세요."
    },
    {
      name: "AI스러운 표현 가능성",
      score: clampScore(aiStyleScore),
      praise: "현재 규칙에서는 AI 글과 유사하게 보일 가능성이 높지 않습니다. 필자의 말투와 판단이 비교적 자연스럽게 드러납니다.",
      middle: `AI 글과 유사하게 보일 가능성은 ${aiStyleDiagnosis.riskLevel}입니다. 일부 익숙한 표현이 꼭 필요한지 살펴보세요.`,
      suggestion: aiStyleDiagnosis.directions[0] ||
        "상투적인 표현을 줄이고 그 자리에 직접 관찰한 상황이나 자신의 판단을 적어 보세요."
    }
  ];

  return items.map((item) => ({
    ...item,
    message: getEvaluationMessage(item, item.score)
  }));
}

// 평가 카드 한 개를 만들어 점수, 막대, 안내 문장을 표시합니다.
function createEvaluationCard(item) {
  const card = document.createElement("article");
  card.className = "evaluation-card";

  if (item.score <= 2) {
    card.classList.add("score-low");
  } else if (item.score >= 4) {
    card.classList.add("score-high");
  }

  const heading = document.createElement("div");
  heading.className = "evaluation-card-heading";

  const title = document.createElement("h4");
  title.textContent = item.name;

  const score = document.createElement("span");
  score.className = "evaluation-score";
  score.textContent = `${item.score} / 5점`;

  const track = document.createElement("div");
  track.className = "score-track";
  track.setAttribute("aria-label", `${item.name} ${item.score}점`);

  const fill = document.createElement("div");
  fill.className = "score-fill";
  fill.style.width = `${item.score * 20}%`;

  const message = document.createElement("p");
  message.textContent = item.message;

  heading.append(title, score);
  track.appendChild(fill);
  card.append(heading, track, message);

  return card;
}

// 전체 평가 요약과 7개 점수 카드를 3단계 화면에 표시합니다.
function renderEvaluation() {
  evaluationResult = evaluateDraft();
  evaluationCards.replaceChildren();

  evaluationResult.forEach((item) => {
    evaluationCards.appendChild(createEvaluationCard(item));
  });

  const scoreSum = evaluationResult.reduce((sum, item) => sum + item.score, 0);
  const average = scoreSum / evaluationResult.length;
  const strongest = evaluationResult.reduce((best, item) =>
    item.score > best.score ? item : best
  );
  const priority = evaluationResult.reduce((lowest, item) =>
    item.score < lowest.score ? item : lowest
  );

  evaluationAverage.textContent = average.toFixed(1);
  strongestAreaTitle.textContent = `${strongest.name} · ${strongest.score}점`;
  strongestAreaText.textContent = strongest.praise;
  priorityAreaTitle.textContent = `${priority.name} · ${priority.score}점`;
  priorityAreaText.textContent = priority.suggestion;

  if (!argumentDraft.essay.trim()) {
    evaluationSummaryText.textContent =
      "아직 본문이 작성되지 않아 준비한 생각을 중심으로 진단했습니다. 본문을 작성하면 더 자세한 결과를 확인할 수 있습니다.";
  } else if (average >= 4) {
    evaluationSummaryText.textContent =
      "논증의 여러 요소가 고르게 드러납니다. 가장 낮은 항목 하나를 골라 다듬으면 글의 완성도가 더 높아질 수 있습니다.";
  } else if (average >= 3) {
    evaluationSummaryText.textContent =
      "논증의 기본 틀이 보입니다. 강한 부분은 유지하고, 우선 수정할 항목부터 한 가지씩 보완해 보세요.";
  } else {
    evaluationSummaryText.textContent =
      "아직 발전시킬 여지가 많은 초안입니다. 점수가 낮은 것은 실패가 아니라 다음에 무엇을 쓰면 좋을지 알려 주는 신호입니다.";
  }
}

// 전용 버튼을 누르면 바로 4단계 고쳐쓰기 화면으로 이동합니다.
goToRevisionButton.addEventListener("click", () => {
  moveToStep(3);
});

/*
  아래 코드는 4단계 고쳐쓰기 화면을 관리합니다.
  앱은 수정 문장을 대신 작성하지 않고, 사용자가 쓴 수정본을 점검해
  스스로 다음 수정 방향을 찾을 수 있는 안내만 제공합니다.
*/

const originalEssayView = document.querySelector("#originalEssayView");
const revisionFeedbackSummary = document.querySelector("#revisionFeedbackSummary");
const revisionEvaluationSummary = document.querySelector("#revisionEvaluationSummary");
const revisionEssay = document.querySelector("#revisionEssay");
const revisionCharacterCount = document.querySelector("#revisionCharacterCount");
const revisionCheckMessage = document.querySelector("#revisionCheckMessage");
const revisionSaveMessage = document.querySelector("#revisionSaveMessage");
const saveRevisionButton = document.querySelector("#saveRevisionButton");
const checkRevisionClaimButton = document.querySelector("#checkRevisionClaimButton");
const checkRevisionEvidenceButton = document.querySelector("#checkRevisionEvidenceButton");
const checkRevisionAiButton = document.querySelector("#checkRevisionAiButton");
const checkRevisionNaturalnessButton = document.querySelector("#checkRevisionNaturalnessButton");

// 사용자가 작성한 수정본을 보관하는 JavaScript 변수입니다.
let revisionDraft = "";

// 수정본 글자 수를 실시간으로 표시합니다.
function updateRevisionCharacterCount() {
  revisionCharacterCount.textContent = `${revisionDraft.length}자`;
}

// 브라우저에 저장한 수정본이 있다면 페이지를 열 때 다시 불러옵니다.
function loadSavedRevision() {
  const savedRevision = readBrowserStorage("naegeuldapgeRevisionDraft");

  if (savedRevision) {
    revisionDraft = savedRevision;
    revisionEssay.value = revisionDraft;
  }

  updateRevisionCharacterCount();
}

// 4단계에 필요한 원문, 피드백 요약, 평가 요약을 최신 상태로 표시합니다.
function renderRevisionScreen() {
  originalEssayView.textContent =
    argumentDraft.essay.trim() || "아직 작성한 논증문이 없습니다.";

  const feedbackResult = analyzeDraft();
  revisionFeedbackSummary.textContent = feedbackResult.overallMessage;

  // 3단계를 방문하지 않았더라도 평가 결과를 바로 계산할 수 있습니다.
  const currentEvaluation = evaluateDraft();
  const priority = currentEvaluation.reduce((lowest, item) =>
    item.score < lowest.score ? item : lowest
  );

  revisionEvaluationSummary.textContent =
    `${priority.name} ${priority.score}점: ${priority.suggestion}`;

  revisionEssay.value = revisionDraft;
  updateRevisionCharacterCount();
}

// 수정본 입력창의 내용이 바뀌면 revisionDraft 변수도 바로 업데이트합니다.
revisionEssay.addEventListener("input", (event) => {
  revisionDraft = event.target.value;
  updateRevisionCharacterCount();
  clearAppNotice();

  // 수정본도 입력할 때마다 임시 저장합니다.
  writeBrowserStorage("naegeuldapgeRevisionDraft", revisionDraft);
});

// 수정본이 없을 때 공통으로 보여 줄 안내입니다.
function showEmptyRevisionMessage() {
  revisionCheckMessage.textContent =
    "먼저 수정본을 작성해 보세요. 짧은 초안이어도 괜찮습니다.";
}

// 수정본에서 핵심 주장이 분명하게 드러나는지 점검합니다.
checkRevisionClaimButton.addEventListener("click", () => {
  if (!revisionDraft.trim()) {
    showEmptyRevisionMessage();
    return;
  }

  const hasClaimExpression =
    /생각한다|주장한다|필요하다|해야 한다|바람직하다|찬성한다|반대한다/.test(revisionDraft);

  revisionCheckMessage.textContent = hasClaimExpression
    ? "수정본에서 필자의 입장이나 주장을 보여 주는 표현이 발견되었습니다. 이 주장이 글 전체에서 일관되게 이어지는지 확인해 보세요."
    : "수정본에서 중심 주장을 바로 찾기 어렵습니다. 가장 말하고 싶은 내용을 한 문장으로 분명하게 밝혀 보세요.";
});

// 수정본에서 이유 설명과 구체적인 사례가 있는지 점검합니다.
checkRevisionEvidenceButton.addEventListener("click", () => {
  if (!revisionDraft.trim()) {
    showEmptyRevisionMessage();
    return;
  }

  const hasReasonExpression = /왜냐하면|그 이유는|때문에|때문이다/.test(revisionDraft);
  const hasExampleExpression =
    /예를 들어|실제로|내 경험|내 경험으로는|사례|조사|통계|연구|\d/.test(revisionDraft);

  if (hasReasonExpression && hasExampleExpression) {
    revisionCheckMessage.textContent =
      "수정본에 이유 설명과 구체적인 사례 표현이 함께 있습니다. 이 사례가 핵심 주장을 직접 뒷받침하는지 확인해 보세요.";
  } else if (!hasExampleExpression) {
    revisionCheckMessage.textContent =
      "수정본에 구체적인 사례 표현이 부족합니다. ‘예를 들어’, ‘실제로’, ‘내 경험으로는’과 같은 표현을 활용해 한 문장을 추가해 보세요.";
  } else {
    revisionCheckMessage.textContent =
      "구체적인 내용은 보입니다. 그 내용이 왜 내 주장을 뒷받침하는지 이유를 한 문장으로 설명해 보세요.";
  }
});

// 수정본에서 자주 쓰이는 상투적 표현이 반복되는지 점검합니다.
checkRevisionAiButton.addEventListener("click", () => {
  if (!revisionDraft.trim()) {
    showEmptyRevisionMessage();
    return;
  }

  const diagnosis = diagnoseAiStyle(revisionDraft);
  const firstFinding = diagnosis.findings[0];
  const firstDirection = diagnosis.directions[0];

  if (diagnosis.riskLevel === "낮음") {
    revisionCheckMessage.textContent =
      `AI 글과 유사하게 보일 가능성은 낮음입니다. ${diagnosis.riskDescription}`;
  } else {
    const findingText = firstFinding
      ? `“${firstFinding.expression}”이 ${firstFinding.count}회 발견되었습니다. ${firstFinding.explanation} `
      : "";

    revisionCheckMessage.textContent =
      `AI 글과 유사하게 보일 가능성은 ${diagnosis.riskLevel}입니다. ` +
      `${findingText}${firstDirection || diagnosis.riskDescription}`;
  }
});

// 수정본의 문장 길이와 끝맺음 반복을 간단히 점검합니다.
checkRevisionNaturalnessButton.addEventListener("click", () => {
  if (!revisionDraft.trim()) {
    showEmptyRevisionMessage();
    return;
  }

  const sentences = getSentences(revisionDraft);
  const awkwardSentences = sentences.filter(
    (sentence) => sentence.length < 10 || sentence.length > 100
  );
  const repeatedEnding = hasRepeatedSentenceEnding(sentences);

  if (sentences.length < 2) {
    revisionCheckMessage.textContent =
      "문장이 아직 적어 문장 흐름을 충분히 살펴보기 어렵습니다. 생각을 조금 더 작성한 뒤 다시 점검해 보세요.";
  } else if (awkwardSentences.length > 0 || repeatedEnding) {
    revisionCheckMessage.textContent =
      "지나치게 짧거나 긴 문장, 또는 비슷한 끝맺음이 반복될 가능성이 있습니다. 수정본을 소리 내어 읽고 숨이 차거나 단조로운 부분을 찾아보세요.";
  } else {
    revisionCheckMessage.textContent =
      "문장 길이와 끝맺음에서 큰 반복은 발견되지 않았습니다. 실제로 소리 내어 읽었을 때도 자연스러운지 확인해 보세요.";
  }
});

// 수정본 저장 버튼을 누르면 브라우저 저장소에 기록하고 확인 메시지를 보여 줍니다.
saveRevisionButton.addEventListener("click", () => {
  const savedSuccessfully = writeBrowserStorage(
    "naegeuldapgeRevisionDraft",
    revisionDraft
  );

  revisionSaveMessage.textContent = savedSuccessfully
    ? "수정본이 저장되었습니다. 이제 수정 전후 비교 단계에서 확인할 수 있습니다."
    : "브라우저 저장 기능을 사용할 수 없습니다. 현재 화면에서는 수정본이 유지됩니다.";
});

// 페이지를 처음 열 때 저장된 수정본을 복원합니다.
loadSavedRevision();

/*
  아래 코드는 5단계 수정 전후 비교 화면을 관리합니다.
  원문과 수정본에서 같은 기준의 수치를 계산한 뒤, 변화의 의미를
  학습자가 이해하기 쉬운 문장으로 설명합니다.
*/

const emptyComparisonMessage = document.querySelector("#emptyComparisonMessage");
const comparisonOriginalEssay = document.querySelector("#comparisonOriginalEssay");
const comparisonRevisionEssay = document.querySelector("#comparisonRevisionEssay");
const originalComparisonCharacters = document.querySelector("#originalComparisonCharacters");
const revisionComparisonCharacters = document.querySelector("#revisionComparisonCharacters");
const comparisonTableBody = document.querySelector("#comparisonTableBody");
const changeSummaryList = document.querySelector("#changeSummaryList");
const improvedComparisonList = document.querySelector("#improvedComparisonList");
const moreToReviseList = document.querySelector("#moreToReviseList");
const returnToRevisionButton = document.querySelector("#returnToRevisionButton");

// 비교에 사용할 구체적 사례 표현과 반론 표현을 한곳에 모읍니다.
const comparisonConcreteExpressions = [
  "예를 들어",
  "실제로",
  "내 경험",
  "내 경험으로는",
  "사례",
  "조사",
  "통계",
  "연구"
];

const comparisonCounterExpressions = [
  "물론",
  "반면",
  "그러나",
  "하지만",
  "반론"
];

// 한 편의 글에서 여섯 가지 비교 수치를 계산합니다.
function getComparisonStatistics(text) {
  const aiDiagnosis = diagnoseAiStyle(text);
  const clicheCount = aiDiagnosis.findings
    .filter((finding) =>
      finding.category === "상투적 도입 표현" ||
      finding.category === "지나치게 포괄적인 표현"
    )
    .reduce((total, finding) => total + finding.count, 0);

  return {
    characters: text.length,
    sentences: getSentences(text).length,
    paragraphs: getParagraphs(text).length,
    cliches: clicheCount,
    concreteExamples:
      countExpressionsInList(text, comparisonConcreteExpressions) +
      (/\d/.test(text) ? 1 : 0),
    counterarguments: countExpressionsInList(text, comparisonCounterExpressions),
    aiDiagnosis
  };
}

// 비교 표의 한 행을 안전하게 만들어 반환합니다.
function createComparisonRow(label, originalValue, revisionValue, changeText, changeClass) {
  const row = document.createElement("tr");
  const labelCell = document.createElement("th");
  const originalCell = document.createElement("td");
  const revisionCell = document.createElement("td");
  const changeCell = document.createElement("td");

  labelCell.scope = "row";
  labelCell.textContent = label;
  originalCell.textContent = originalValue;
  revisionCell.textContent = revisionValue;
  changeCell.textContent = changeText;
  changeCell.className = changeClass;

  row.append(labelCell, originalCell, revisionCell, changeCell);
  return row;
}

// 숫자의 증감 값을 +2, -1, 변화 없음 형태로 표시합니다.
function getDifferenceText(originalValue, revisionValue) {
  const difference = revisionValue - originalValue;

  if (difference > 0) {
    return `+${difference}`;
  }

  if (difference < 0) {
    return `${difference}`;
  }

  return "변화 없음";
}

// 수정 전후 수치와 의미를 분석하여 화면에 필요한 결과를 만듭니다.
function analyzeComparison() {
  const original = getComparisonStatistics(argumentDraft.essay);
  const revision = getComparisonStatistics(revisionDraft);
  const summaries = [];
  const improved = [];
  const moreToRevise = [];

  if (revision.aiDiagnosis.riskScore < original.aiDiagnosis.riskScore) {
    summaries.push({
      type: "positive",
      text:
        `AI 글과 유사하게 보일 가능성이 원문의 ${original.aiDiagnosis.riskLevel}에서 ` +
        `수정본의 ${revision.aiDiagnosis.riskLevel}으로 낮아졌습니다. 자신의 상황과 판단이 더 드러나는지 확인해 보세요.`
    });
    improved.push({
      type: "positive",
      text: "AI 글과 유사하게 보일 수 있는 표현과 특징이 줄었습니다."
    });
  } else if (revision.aiDiagnosis.riskLevel === "높음") {
    summaries.push({
      type: "warning",
      text: revision.aiDiagnosis.riskDescription
    });
    moreToRevise.push({
      type: "warning",
      text: revision.aiDiagnosis.directions[0] ||
        "표시된 표현 중 한두 곳을 자신의 경험이나 판단으로 구체화해 보세요."
    });
  }

  if (revision.concreteExamples > original.concreteExamples) {
    const text =
      "수정본에서는 원문보다 구체적인 사례 표현이 늘어났습니다. 이는 근거를 더 설득력 있게 만드는 데 도움이 됩니다.";
    summaries.push({ type: "positive", text });
    improved.push({ type: "positive", text: "구체적인 사례나 자료를 더 활용했습니다." });
  } else if (revision.concreteExamples === 0) {
    const text =
      "수정본에도 구체적인 사례 표현이 아직 보이지 않습니다. 실제 상황, 경험 또는 숫자 자료를 한 가지 추가해 보세요.";
    summaries.push({ type: "warning", text });
    moreToRevise.push({ type: "warning", text: "근거에 구체적인 사례나 상황을 추가해 보세요." });
  }

  if (revision.cliches < original.cliches) {
    const text =
      "수정본에서는 상투적인 표현이 줄었습니다. 필자의 생각과 상황이 더 직접적으로 드러날 가능성이 커졌습니다.";
    summaries.push({ type: "positive", text });
    improved.push({ type: "positive", text: "누구나 쓸 수 있는 상투적 표현을 줄였습니다." });
  } else if (revision.cliches > 0) {
    const text =
      "수정본에서도 ‘현대 사회에서’, ‘중요한 문제이다’ 같은 상투적 표현이 남아 있습니다. 한 문장 정도는 자신의 경험이나 구체적 상황으로 바꾸어 보세요.";
    summaries.push({ type: "warning", text });
    moreToRevise.push({ type: "warning", text: "남아 있는 상투적 표현을 더 구체적인 판단으로 바꾸어 보세요." });
  } else {
    improved.push({ type: "positive", text: "수정본에서 눈에 띄는 상투적 표현이 발견되지 않았습니다." });
  }

  if (revision.counterarguments > original.counterarguments) {
    const text =
      "수정본에서는 다른 입장을 고려하는 표현이 늘었습니다. 논증이 더 균형 있게 보이는 데 도움이 됩니다.";
    summaries.push({ type: "positive", text });
    improved.push({ type: "positive", text: "반론을 고려하는 표현을 더 분명하게 넣었습니다." });
  } else if (revision.counterarguments === 0) {
    moreToRevise.push({ type: "warning", text: "다른 입장의 반론과 그에 대한 답을 본문에 드러내 보세요." });
  }

  if (revision.paragraphs > original.paragraphs && revision.paragraphs >= 2) {
    summaries.push({
      type: "positive",
      text: "수정본에서 문단이 나뉘어 생각의 단계를 구분하기 쉬워졌습니다."
    });
    improved.push({ type: "positive", text: "내용에 따라 문단을 나누어 흐름을 정리했습니다." });
  } else if (revision.paragraphs < 2 && revision.sentences >= 4) {
    moreToRevise.push({
      type: "warning",
      text: "여러 문장이 한 문단에 모여 있습니다. 주장, 근거, 반론이 바뀌는 지점에서 문단을 나누어 보세요."
    });
  }

  if (revision.characters > original.characters) {
    summaries.push({
      text: "수정본의 글자 수가 늘었습니다. 새로 추가한 내용이 주장이나 근거를 실제로 더 분명하게 하는지 확인해 보세요."
    });
  } else if (revision.characters < original.characters) {
    summaries.push({
      text: "수정본의 글자 수가 줄었습니다. 불필요한 표현은 정리되었는지, 필요한 근거까지 빠지지는 않았는지 함께 확인해 보세요."
    });
  } else {
    summaries.push({
      text: "원문과 수정본의 글자 수는 같습니다. 문장의 수보다 내용과 표현이 어떻게 달라졌는지 살펴보세요."
    });
  }

  if (improved.length === 0) {
    improved.push({
      text: "수정본을 직접 다시 작성한 과정 자체가 중요한 변화입니다. 원문과 달라진 문장을 찾아 그 이유를 설명해 보세요."
    });
  }

  if (moreToRevise.length === 0) {
    moreToRevise.push({
      text: "큰 보완 신호는 발견되지 않았습니다. 마지막으로 소리 내어 읽으며 자신의 말투처럼 들리는지 확인해 보세요."
    });
  }

  return { original, revision, summaries, improved, moreToRevise };
}

// 원문과 수정본, 비교 표, 변화 안내를 5단계 화면에 표시합니다.
function renderComparisonScreen() {
  const hasRevision = revisionDraft.trim().length > 0;
  emptyComparisonMessage.hidden = hasRevision;

  comparisonOriginalEssay.textContent =
    argumentDraft.essay.trim() || "아직 작성한 논증문이 없습니다.";
  comparisonRevisionEssay.textContent =
    revisionDraft.trim() || "먼저 4단계에서 수정본을 작성해 주세요.";

  const result = analyzeComparison();
  originalComparisonCharacters.textContent = `${result.original.characters}자`;
  revisionComparisonCharacters.textContent = `${result.revision.characters}자`;

  const comparisonRows = [
    ["글자 수", result.original.characters, result.revision.characters, "일반"],
    ["문장 수", result.original.sentences, result.revision.sentences, "일반"],
    ["문단 수", result.original.paragraphs, result.revision.paragraphs, "증가"],
    ["상투적 표현 개수", result.original.cliches, result.revision.cliches, "감소"],
    ["구체적 사례 표현 개수", result.original.concreteExamples, result.revision.concreteExamples, "증가"],
    ["반론 표현 개수", result.original.counterarguments, result.revision.counterarguments, "증가"]
  ];

  comparisonTableBody.replaceChildren();

  comparisonRows.forEach(([label, originalValue, revisionValue, preferredDirection]) => {
    let changeClass = "change-neutral";

    if (preferredDirection === "증가" && revisionValue > originalValue) {
      changeClass = "change-positive";
    } else if (preferredDirection === "감소" && revisionValue < originalValue) {
      changeClass = "change-positive";
    } else if (
      (preferredDirection === "증가" && revisionValue < originalValue) ||
      (preferredDirection === "감소" && revisionValue > originalValue)
    ) {
      changeClass = "change-warning";
    }

    comparisonTableBody.appendChild(
      createComparisonRow(
        label,
        originalValue,
        revisionValue,
        getDifferenceText(originalValue, revisionValue),
        changeClass
      )
    );
  });

  if (hasRevision) {
    renderFeedbackList(changeSummaryList, result.summaries);
    renderFeedbackList(improvedComparisonList, result.improved);
    renderFeedbackList(moreToReviseList, result.moreToRevise);
  } else {
    const emptyGuide = [{
      type: "warning",
      text: "먼저 4단계에서 수정본을 작성해 주세요."
    }];
    renderFeedbackList(changeSummaryList, emptyGuide);
    renderFeedbackList(improvedComparisonList, emptyGuide);
    renderFeedbackList(moreToReviseList, emptyGuide);
  }
}

// 다시 고쳐쓰기 버튼을 누르면 수정본을 유지한 채 4단계로 돌아갑니다.
returnToRevisionButton.addEventListener("click", () => {
  moveToStep(3);
});
