import type { Template } from '@/src/types/domain';

export const TEMPLATE_PRESETS: Template[] = [
  {
    id: 'template-sermon-notes',
    name: 'Sermon Notes',
    description: 'A clean framework for capturing Sunday teaching.',
    icon: 'mic-outline',
    threadHint: 'thread-sermons',
    body: (
      '<h1>Sermon Title</h1>' +
      '<p><strong>Speaker:</strong> </p>' +
      '<p><strong>Text:</strong> </p>' +
      '<p><strong>Big Idea:</strong> </p>' +
      '<h2>Key Points</h2>' +
      '<ul><li></li></ul>' +
      '<h2>Application</h2>' +
      '<ul><li></li></ul>' +
      '<h2>Prayer</h2>' +
      '<blockquote>Lord, help me live this out.</blockquote>'
    ),
  },
  {
    id: 'template-soap',
    name: 'SOAP',
    description: 'Scripture, Observation, Application, Prayer.',
    icon: 'water-outline',
    threadHint: 'thread-personal-journal',
    body: (
      '<h1>SOAP</h1>' +
      '<h2>Scripture</h2>' +
      '<ul><li>Passage:</li></ul>' +
      '<h2>Observation</h2>' +
      '<ul><li></li></ul>' +
      '<h2>Application</h2>' +
      '<ul><li></li></ul>' +
      '<h2>Prayer</h2>' +
      '<blockquote></blockquote>'
    ),
  },
  {
    id: 'template-inductive-study',
    name: 'Inductive Study',
    description: 'Observe, interpret, and apply the text.',
    icon: 'search-outline',
    threadHint: 'thread-small-group',
    body: (
      '<h1>Inductive Study</h1>' +
      '<h2>Observation</h2>' +
      '<ul><li>Repeated words:</li><li>People and places:</li></ul>' +
      '<h2>Interpretation</h2>' +
      '<ul><li>What does this reveal about God?</li><li>What is the author emphasizing?</li></ul>' +
      '<h2>Application</h2>' +
      '<ul><li>What do I need to obey or remember?</li></ul>'
    ),
  },
];
