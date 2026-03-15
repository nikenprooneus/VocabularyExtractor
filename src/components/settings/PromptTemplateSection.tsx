interface PromptTemplateSectionProps {
  promptTemplate: string;
  onPromptTemplateChange: (value: string) => void;
}

export function PromptTemplateSection({
  promptTemplate,
  onPromptTemplateChange,
}: PromptTemplateSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Prompt Template</h2>
      <div className="space-y-4">
        <textarea
          value={promptTemplate}
          onChange={(e) => onPromptTemplateChange(e.target.value)}
          placeholder="Enter your custom prompt template. Use {{Word}} and {{Example}} for dynamic variables, and marker tags for output fields."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-2">Available variables:</p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>
              <code className="bg-white px-1 py-0.5 rounded">{'{{Word}}'}</code> - The English
              word to extract vocabulary for
            </li>
            <li>
              <code className="bg-white px-1 py-0.5 rounded">{'{{Example}}'}</code> - The example
              sentence (optional)
            </li>
            <li>
              <code className="bg-white px-1 py-0.5 rounded">{'{{Concept Bank}}'}</code> - Your
              saved concept hierarchy (auto-injected at generate time)
            </li>
          </ul>
          <p className="font-medium mb-1">How to use marker tags:</p>
          <p className="mb-2">Include marker tags from your output fields in your prompt. The AI will embed values within these tags. Example:</p>
          <code className="block bg-white px-2 py-1 rounded text-xs">
            &Phonetic&{`{/səˈrɛndɪpɪti/}`}
          </code>
          <p className="mt-2">The AI can provide detailed explanations and reasoning alongside the tagged values.</p>
          <p className="font-medium mt-3 mb-1">Polysemic (multiple meanings) tags:</p>
          <p className="mb-1">To extract multiple meanings, instruct the AI to use numbered tags and the count tag:</p>
          <code className="block bg-white px-2 py-1 rounded text-xs mb-1">
            &No of Definition&{`{2}`}
          </code>
          <code className="block bg-white px-2 py-1 rounded text-xs mb-1">
            &Tier1 1&{`{abstract}`} &Tier1 2&{`{concrete}`}
          </code>
          <p className="mt-1">Fields like <code className="bg-white px-1 rounded">Tier1</code>, <code className="bg-white px-1 rounded">Tier2</code>, <code className="bg-white px-1 rounded">Tier3</code> drive the Concept Tree visualization.</p>
        </div>
        <p className="text-xs text-gray-500">
          Character count: {promptTemplate.length}
        </p>
      </div>
    </div>
  );
}
