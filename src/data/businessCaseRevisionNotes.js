export const REVISION_PACK = {
  id: 'business-case-financial-case-v1',
  subject: 'Business Analysis',
  title: 'Making a Business and Financial Case',
  subtitle: 'Teacher revision pack',
  description:
    'A focused guide to building, evaluating, presenting, and reviewing a sound business case.',
};

export const BUSINESS_CASE_NOTES = [
  {
    id: 'purpose',
    number: '01',
    title: 'Purpose of a Business Case',
    summary: 'A business case turns analysis into a clear recommendation for decision makers.',
    paragraphs: [
      'A business case is one of the business analyst\'s key project documents. It presents the findings of an investigation and recommends a course of action for senior management to consider.',
      'It should be persuasive but evidence-based. The reader needs to understand the size of the problem or opportunity, the expected value of acting, and why the recommended option is preferable.',
    ],
    bullets: [
      'Lead with business benefits before discussing cost.',
      'Connect every proposed feature to a measurable outcome.',
      'Use evidence, assumptions, and risks to support the recommendation.',
      'Write for the people who will approve, fund, or sponsor the work.',
    ],
    keyPoint: 'A business case explains why the organisation should invest, not merely what it should build.',
    check: {
      question: 'Why should benefits usually be explained before costs?',
      answer: 'Decision makers first need to understand the value of solving the problem. Cost can then be judged against that expected value.',
    },
  },
  {
    id: 'lifecycle',
    number: '02',
    title: 'The Project Lifecycle',
    summary: 'The business case is a living decision document that must be reviewed as the project changes.',
    paragraphs: [
      'An initial business case often follows a feasibility study. At this stage, requirements are broad and estimates are preliminary, so assumptions must be stated clearly.',
      'Before deployment, the case should be reviewed using updated costs, risks, and expected benefits. A post-project review later checks whether the investment delivered what was promised.',
    ],
    bullets: [
      'Initial case: define the need, options, and early estimates.',
      'Pre-deployment review: confirm that the case is still valid.',
      'Post-project review: compare planned and actual results.',
    ],
    keyPoint: 'Approval at the start does not remove the need for later review.',
    diagram: {
      title: 'Business case review cycle',
      type: 'flow',
      steps: ['Feasibility', 'Initial case', 'Pre-deployment review', 'Post-project review'],
    },
    check: {
      question: 'What is the purpose of a post-project review?',
      answer: 'It checks whether the implemented solution delivered its forecast benefits and records lessons for future projects.',
    },
  },
  {
    id: 'options',
    number: '03',
    title: 'Identifying and Shortlisting Options',
    summary: 'Good analysis considers several credible responses before selecting a preferred option.',
    paragraphs: [
      'Business options describe what the organisation could do. Technical options describe how a selected business option could be implemented. These decisions are related, but they are not the same.',
      'Process and activity modelling can reveal alternative ways of working. Analysts can also learn from comparable organisations. The long list should normally be reduced to three or four viable options for detailed comparison.',
    ],
    bullets: [
      'Include a realistic do-nothing or minimum-change baseline where appropriate.',
      'Reject options that cannot satisfy essential requirements.',
      'Compare the shortlist using consistent time, cost, benefit, risk, and feasibility criteria.',
    ],
    keyPoint: 'Choose the preferred option only after applying the same criteria to every shortlisted option.',
    diagram: {
      title: 'Option selection funnel',
      type: 'flow',
      steps: ['Business need', 'Generate options', 'Test feasibility', 'Shortlist 3-4'],
    },
    check: {
      question: 'How does a business option differ from a technical option?',
      answer: 'A business option defines what should change or be achieved; a technical option explains how technology could deliver it.',
    },
  },
  {
    id: 'structure',
    number: '04',
    title: 'Structure of the Business Case',
    summary: 'A consistent structure helps decision makers find the evidence behind the recommendation.',
    paragraphs: [
      'The executive summary is placed near the beginning but should be written last. It must condense the need, options, recommendation, financial case, major benefits, and major risks into a short decision-focused section.',
    ],
    bullets: [
      'Introduction and purpose',
      'Executive or management summary',
      'Current situation and business need',
      'Options considered and evaluation method',
      'Costs, benefits, and investment appraisal',
      'Impact and risk assessments',
      'Recommendation and implementation implications',
      'Appendices and supporting evidence',
    ],
    keyPoint: 'The document should allow a busy reader to trace the recommendation back to evidence.',
    check: {
      question: 'Why is the executive summary usually written last?',
      answer: 'The writer needs the completed analysis and recommendation before accurately summarising the whole case.',
    },
  },
  {
    id: 'costs-benefits',
    number: '05',
    title: 'Costs and Benefits',
    summary: 'A balanced case includes direct financial effects and important outcomes that are harder to measure.',
    paragraphs: [
      'Tangible items can normally be assigned a monetary value. Intangible items may still be important, but their value is less direct and should be supported with suitable indicators or evidence.',
      'Costs must include the full life of the solution, not only development. Benefits should have an owner, a measurement method, and a realistic date by which they are expected to appear.',
    ],
    bullets: [
      'Tangible costs: staff time, hardware, software, infrastructure, relocation, training, maintenance, and support.',
      'Intangible costs: disruption, temporary productivity loss, recruitment effort, and resistance to change.',
      'Tangible benefits: staff savings, reduced effort, fewer errors, and faster processing.',
      'Intangible benefits: satisfaction, flexibility, better information, reputation, communication, and innovation capacity.',
    ],
    keyPoint: 'A benefit is credible only when the case explains how and when it will be measured.',
    diagram: {
      title: 'Cost-benefit classification',
      type: 'matrix',
      cells: [
        { label: 'Tangible costs', detail: 'Money and time used' },
        { label: 'Intangible costs', detail: 'Disruption and effort' },
        { label: 'Tangible benefits', detail: 'Savings and speed' },
        { label: 'Intangible benefits', detail: 'Quality and satisfaction' },
      ],
    },
    check: {
      question: 'Give one reason why an intangible benefit should still be included.',
      answer: 'An outcome such as customer satisfaction or better management information can strongly affect organisational success even when it has no immediate cash value.',
    },
  },
  {
    id: 'impact-risk',
    number: '06',
    title: 'Impact and Risk Assessment',
    summary: 'A financially attractive option can still fail if organisational impacts and risks are ignored.',
    paragraphs: [
      'Impact assessment looks beyond the budget. It considers organisational structure, relationships between departments, working practices, management style, recruitment, appraisal, incentives, and supplier relationships.',
      'Risk assessment records uncertainty in a form that can be managed. Each important risk needs a clear cause and effect, an assessment of likelihood and impact, planned countermeasures, and a named owner.',
    ],
    bullets: [
      'Describe the risk event and its cause.',
      'Estimate its probability and potential impact.',
      'Select an avoidance, reduction, transfer, or acceptance response.',
      'Assign an owner and review date.',
    ],
    keyPoint: 'A risk without an owner is unlikely to be actively managed.',
    diagram: {
      title: 'Risk management sequence',
      type: 'flow',
      steps: ['Identify', 'Assess', 'Respond', 'Assign owner', 'Monitor'],
    },
    check: {
      question: 'What two ratings are commonly used to prioritise a risk?',
      answer: 'Its probability of occurring and the scale of its impact if it occurs.',
    },
  },
  {
    id: 'investment',
    number: '07',
    title: 'Investment Appraisal',
    summary: 'Investment appraisal tests whether forecast returns justify the timing and scale of expenditure.',
    paragraphs: [
      'A project cash-flow forecast places expected costs and tangible benefits on a timeline. The payback period is the point at which cumulative benefits recover the original investment.',
      'Discounted cash flow recognises that money received in the future is worth less than money available today. Discounting future cash flows produces the project\'s net present value (NPV).',
    ],
    bullets: [
      'Payback is simple and useful for understanding how quickly an investment is recovered.',
      'NPV accounts for the timing of cash flows and supports comparison between investments.',
      'Financial calculations are only as reliable as the assumptions behind the forecast.',
    ],
    keyPoint: 'Use financial measures together with strategic benefits, impact, and risk rather than in isolation.',
    check: {
      question: 'What does a positive NPV generally indicate?',
      answer: 'The discounted value of expected benefits is greater than the discounted value of expected costs.',
    },
  },
  {
    id: 'presentation',
    number: '08',
    title: 'Presenting the Recommendation',
    summary: 'The message should be concise, audience-aware, and easy to connect to the decision required.',
    paragraphs: [
      'A business case may be delivered as a written document, a face-to-face presentation, or both. The level of detail and language should match the audience while preserving the evidence behind the recommendation.',
    ],
    bullets: [
      'State the decision required from the audience.',
      'Use clear visuals and enough white space for rapid scanning.',
      'Explain the recommendation, strongest benefits, headline costs, and major risks.',
      'Use the structure: preview the message, present it, then recap it.',
    ],
    keyPoint: 'A strong presentation makes the decision easier without hiding uncertainty.',
    check: {
      question: 'What should the audience know at the end of the presentation?',
      answer: 'What is recommended, why it is preferred, what value it should create, what it will cost, what could go wrong, and what decision is needed.',
    },
  },
  {
    id: 'benefits-realisation',
    number: '09',
    title: 'Benefits Realisation',
    summary: 'Benefits must be actively owned, measured, and protected after the solution is delivered.',
    paragraphs: [
      'Benefits realisation manages the project and subsequent business change so that forecast outcomes can actually occur. Measures should be agreed before implementation, with baseline values recorded where possible.',
      'A benefits realisation report compares actual results with the business case. It helps decision makers judge whether the investment was justified and improves the quality of future estimates.',
    ],
    bullets: [
      'Define each benefit and its measurement method.',
      'Name the person accountable for achieving it.',
      'Set a baseline, target, and expected date.',
      'Monitor progress and take corrective action when delivery is at risk.',
    ],
    keyPoint: 'Project delivery creates capability; business change converts that capability into benefits.',
    diagram: {
      title: 'Benefits map',
      type: 'flow',
      steps: ['Business change', 'New capability', 'Measured benefit', 'Business objective'],
    },
    check: {
      question: 'Why should benefit measures be agreed before implementation?',
      answer: 'Early agreement makes it possible to record a baseline and prevents success measures from being changed after results are known.',
    },
  },
];
