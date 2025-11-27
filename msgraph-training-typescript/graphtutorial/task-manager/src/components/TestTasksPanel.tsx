// Test Tasks Panel Component

import { TEST_TASKS, TASK_TYPES } from '../constants/taskConfig';

interface TestTasksPanelProps {
  onCreateTestTask: (
    taskType: string,
    title: string,
    description: string,
    priority: 'low' | 'medium' | 'high'
  ) => void;
}

const TestTasksPanel: React.FC<TestTasksPanelProps> = ({ onCreateTestTask }) => {
  return (
    <div className="test-tasks-panel">
      <h3>🧪 Test Tasks</h3>
      <div className="test-tasks-grid">
        {TEST_TASKS.map((task) => {
          const config = TASK_TYPES[task.type as keyof typeof TASK_TYPES];
          return (
            <button
              key={task.type}
              onClick={() => onCreateTestTask(task.type, task.title, task.description, task.priority)}
              className={`test-task-btn test-task-btn--${task.type}`}
            >
              {config?.emoji} {config?.label || task.type}
            </button>
          );
        })}
      </div>
      <p className="test-tasks-hint">
        Click any button to create a test task of that type
      </p>
    </div>
  );
};

export default TestTasksPanel;
