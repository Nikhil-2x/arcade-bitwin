import React, { useState } from 'react'
import type { GameTask, TaskCategory } from '../network/milestone6Types.ts'
import type { PlayerRole } from '../network/networkTypes.ts'
import './TaskPanel.css'

interface TaskPanelProps {
  role: PlayerRole
  tasks: GameTask[]
  onSelectTaskTarget?: (entityId: string) => void
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ role, tasks, onSelectTaskTarget }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true)
  const isRunner = role === 'runner'

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length
  const totalCount = tasks.length
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const getCategoryLabel = (cat: TaskCategory) => {
    switch (cat) {
      case 'CIVIC_MAIN':
        return '🚨 PRIORITY CIVIC PROTOCOL'
      case 'CIVIC_SECONDARY':
        return '👥 BYSTANDER & SCENE SUPPORT'
      case 'CIVIC_BONUS':
        return '⭐ VERIFICATION & CONTRADICTIONS'
      case 'COVER':
        return '🛡️ ALIBI & HELPFUL ACTIONS'
      case 'COVERT':
        return '⚡ COVERT SABOTAGE'
      case 'DECEPTION':
        return '🎭 DECEPTION & NARRATIVE'
      default:
        return 'OBJECTIVES'
    }
  }

  // Group tasks by category
  const categories: TaskCategory[] = isRunner
    ? ['CIVIC_MAIN', 'CIVIC_SECONDARY', 'CIVIC_BONUS']
    : ['COVER', 'COVERT', 'DECEPTION']

  return (
    <div className={`cc-task-drawer ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="cc-task-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="cc-task-title-row">
          <span className="cc-task-icon">{isRunner ? '📋' : '🕵️'}</span>
          <span className="cc-task-header-text">
            {isRunner ? 'CIVIC RESPONSE PROTOCOLS' : 'SECRET OPERATIONS & ALIBIS'}
          </span>
          <span className="cc-task-badge">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="cc-task-progress-mini">
          <div className="cc-task-progress-fill" style={{ width: `${percentComplete}%` }} />
        </div>
        <button
          className="cc-task-toggle-btn"
          aria-label={isExpanded ? 'Collapse task panel' : 'Expand task panel'}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="cc-task-body">
          {categories.map((cat) => {
            const catTasks = tasks.filter((t) => t.category === cat)
            if (catTasks.length === 0) return null

            return (
              <div key={cat} className="cc-task-section">
                <div className="cc-task-section-title">{getCategoryLabel(cat)}</div>
                <div className="cc-task-list">
                  {catTasks.map((t) => {
                    const isLocked = t.status === 'LOCKED'
                    const isCompleted = t.status === 'COMPLETED'
                    const isInProgress = t.status === 'IN_PROGRESS'

                    return (
                      <div
                        key={t.id}
                        className={`cc-task-card ${t.status.toLowerCase()} ${
                          t.targetEntityId ? 'interactive' : ''
                        }`}
                        onClick={() => {
                          if (t.targetEntityId && onSelectTaskTarget && !isLocked) {
                            onSelectTaskTarget(t.targetEntityId)
                          }
                        }}
                      >
                        <div className="cc-task-status-indicator">
                          {isCompleted && '✓'}
                          {isInProgress && '▶'}
                          {t.status === 'AVAILABLE' && '○'}
                          {isLocked && '🔒'}
                        </div>

                        <div className="cc-task-content">
                          <div className="cc-task-name-row">
                            <span className="cc-task-title">{t.title}</span>
                            <span className="cc-task-points">+{t.rewardPoints} pts</span>
                          </div>
                          <div className="cc-task-desc">{t.description}</div>

                          {t.hint && !isCompleted && !isLocked && (
                            <div className="cc-task-hint">
                              <span className="hint-ico">💡</span> {t.hint}
                            </div>
                          )}

                          {t.dependencies && t.dependencies.length > 0 && isLocked && (
                            <div className="cc-task-deps">
                              Requires: {t.dependencies.join(', ')}
                            </div>
                          )}

                          {isInProgress && (
                            <div className="cc-task-item-progress">
                              <div
                                className="cc-task-item-fill"
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
