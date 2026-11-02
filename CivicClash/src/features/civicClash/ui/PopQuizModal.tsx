import React, { useState } from 'react'
import type { CivicClashStore } from '../store/useCivicClash.ts'
import { QUIZ_QUESTIONS } from '../data/quizzes.ts'
import { sound } from '../engine/audio.ts'

export const PopQuizModal: React.FC<{ store: CivicClashStore }> = ({ store }) => {
  const { level, nextRoundOrLevel, language, roundNumber } = store

  const questions = QUIZ_QUESTIONS.filter((q) => q.levelId === level.id)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [scoreEarned, setScoreEarned] = useState(0)

  const currentQ = questions[currentIdx]

  const handleSelect = (idx: number) => {
    if (answered) return
    setSelectedOptionIdx(idx)
    setAnswered(true)

    const isCorrect = currentQ.options[idx].isCorrect
    if (isCorrect) {
      sound.playSuccess()
      setScoreEarned((s) => s + 50)
    } else {
      sound.playError()
    }
  }

  const handleNext = () => {
    sound.playClick()
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((c) => c + 1)
      setSelectedOptionIdx(null)
      setAnswered(false)
    } else {
      // Quiz complete!
      nextRoundOrLevel()
    }
  }

  if (!currentQ) return null

  return (
    <div className="cc-modal-backdrop">
      <div className="cc-quiz-window">
        <div className="cc-quiz-header">
          <div className="cc-quiz-badge-row">
            <span className="cc-quiz-badge">POP QUIZ SHOWDOWN</span>
            <span className="cc-quiz-progress">
              QUESTION {currentIdx + 1} OF {questions.length}
            </span>
          </div>
          <h2 className="cc-quiz-question">
            {language === 'hi' ? currentQ.questionHi : currentQ.question}
          </h2>
        </div>

        {/* Options */}
        <div className="cc-quiz-options">
          {currentQ.options.map((opt, idx) => {
            let stateClass = ''
            if (answered) {
              if (opt.isCorrect) stateClass = 'correct'
              else if (selectedOptionIdx === idx) stateClass = 'wrong'
            }

            return (
              <button
                key={idx}
                className={`cc-quiz-option-btn ${stateClass}`}
                onClick={() => handleSelect(idx)}
                disabled={answered}
              >
                <span className="cc-option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="cc-option-text">
                  {language === 'hi' ? opt.textHi : opt.text}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation Alert */}
        {answered && (
          <div className="cc-quiz-explanation">
            <div className="cc-explanation-top">
              <span className="cc-explanation-tag">
                {currentQ.options[selectedOptionIdx!].isCorrect
                  ? '✓ CORRECT! (+50 PTS)'
                  : '✕ INCORRECT'}
              </span>
              <span className="cc-citation-code">{currentQ.legalCitation}</span>
            </div>
            <p className="cc-explanation-body">
              {language === 'hi' ? currentQ.explanationHi : currentQ.explanation}
            </p>
          </div>
        )}

        {/* Action Button */}
        {answered && (
          <div className="cc-quiz-footer">
            <button className="cc-action-btn primary" onClick={handleNext}>
              {currentIdx < questions.length - 1
                ? (language === 'hi' ? 'अगला सवाल →' : 'Next Question →')
                : (roundNumber === 1
                    ? (language === 'hi' ? 'भूमिका बदलें (राउंड B शुरू) →' : 'Swap Roles (Start Round B) →')
                    : (level.id < 3
                        ? (language === 'hi' ? 'अगला स्तर अनलॉक करें →' : 'Unlock Next Level →')
                        : (language === 'hi' ? 'अंतिम परिणाम देखें →' : 'View Final Match Results →')))}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

