import React, { useState } from 'react';
import { BrainCircuit, ChevronDown, MessageSquare, Lightbulb } from 'lucide-react';

interface QAListProps {
  questions: any;
}

export const QAList: React.FC<QAListProps> = ({ questions }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // [FIX CRITIQUE] Sécurisation de l'extraction : si l'IA a renvoyé un objet { questions: [...] } on extrait le tableau
  const safeQuestions = Array.isArray(questions) ? questions : (questions?.questions || []);

  return (
    <div className="qa-list">
      {safeQuestions.map((item: any, index: number) => (
        <div key={index} className="qa-item" style={{ animationDelay: `${index * 100}ms` }}>
          <div className="qa-header" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
            <div className="qa-icon"><BrainCircuit size={20} /></div>
            <div className="qa-question-content">
              <div className="qa-category">{item.category}</div>
              <p className="qa-question">{item.question}</p>
            </div>
            <ChevronDown className={`qa-chevron ${openIndex === index ? 'open' : ''}`} />
          </div>
          {openIndex === index && (
            <div className="qa-body">
              <div className="qa-answer-box">
                <h4 className="qa-answer-title"><MessageSquare size={16} /> Réponse Suggérée</h4>
                <textarea className="qa-answer-textarea" defaultValue={item.suggested_answer} />
              </div>
              <div className="qa-advice">
                <Lightbulb size={28} style={{ flexShrink: 0 }} />
                <span><strong>Conseil du Coach :</strong> {item.advice}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};