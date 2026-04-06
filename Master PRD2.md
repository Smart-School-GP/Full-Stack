Perfect. Four major LMS features, 6-8 weeks, advanced and comprehensive. Let me write the full PRD now.

---

# Product Requirements Document — Phase 6
## School Ecosystem Management Platform
### LMS Enhancement: Learning Paths · Discussion Boards · Student Portfolio & Badges · Timetable & Scheduling

**Version:** 6.0
**Builds on:** Phase 1 through Phase 5
**Timeline:** Weeks 41–48
**Repo:** https://github.com/Smart-School-GP/Full-Stack.git
**Inspired by:** Canvas LMS, Moodle, Blackboard, Schoology, Brightspace
**New Stack Additions:** Quill.js (rich text editor) · React DnD (drag and drop) · FullCalendar.js · Sharp (image processing) · Bull (job queue)

---

## 1. Overview

Phase 6 transforms the platform from a school management tool into a full Learning Management System. Canvas uses learning paths to guide students through structured content. Moodle pioneered discussion boards as a core pedagogical tool. Blackboard introduced digital portfolios as evidence of learning. Every major university LMS has a timetable system at its core. This phase adds all four, making your platform competitive with enterprise LMS solutions used by top universities worldwide — but tailored for the K-12 market in Jordan and Iraq.

---

## 2. New Stack Components

```bash
# Frontend
npm install @hello-pangea/dnd quill react-quill @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# Backend
npm install bull sharp multer-sharp

# New Python packages (ai-service)
# None required for Phase 6
```

---

## 3. New Database Tables

```sql
-- Learning paths
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Learning path modules (chapters/units)
CREATE TABLE path_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  unlock_condition VARCHAR(20) DEFAULT 'sequential'
    CHECK (unlock_condition IN ('sequential', 'free', 'score_based')),
  min_score_to_unlock FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Learning path items (content within a module)
CREATE TABLE path_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES path_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL
    CHECK (type IN ('lesson', 'assignment', 'video', 'file', 'link', 'quiz')),
  content TEXT,
  file_url VARCHAR(500),
  external_url VARCHAR(500),
  order_index INT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student progress through learning paths
CREATE TABLE path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES path_items(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score FLOAT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(student_id, item_id)
);

-- Discussion boards (one per subject or school-wide)
CREATE TABLE discussion_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  type VARCHAR(20) DEFAULT 'general'
    CHECK (type IN ('general', 'qa', 'debate', 'announcement')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Discussion threads
CREATE TABLE discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES discussion_boards(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discussion replies
CREATE TABLE discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES discussion_replies(id),
  author_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  is_accepted_answer BOOLEAN DEFAULT FALSE,
  upvotes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reply upvotes (prevent double voting)
CREATE TABLE reply_upvotes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, reply_id)
);

-- Badge definitions
CREATE TABLE badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  icon_emoji VARCHAR(10),
  color VARCHAR(7),
  criteria_type VARCHAR(30) NOT NULL
    CHECK (criteria_type IN (
      'grade_average', 'attendance_rate', 'path_completion',
      'discussion_participation', 'streak', 'manual'
    )),
  criteria_value FLOAT,
  points_value INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student earned badges
CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES users(id),
  awarded_at TIMESTAMP DEFAULT NOW(),
  note TEXT,
  UNIQUE(student_id, badge_id)
);

-- Student portfolio items
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL
    CHECK (type IN ('project', 'essay', 'artwork', 'certificate', 'achievement', 'other')),
  file_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  subject_id UUID REFERENCES subjects(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student XP and level (gamification)
CREATE TABLE student_xp (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Timetable periods (school's bell schedule)
CREATE TABLE timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  period_number INT NOT NULL,
  UNIQUE(school_id, period_number)
);

-- Weekly timetable slots
CREATE TABLE timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  period_id UUID REFERENCES timetable_periods(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  room VARCHAR(50),
  color VARCHAR(7),
  effective_from DATE NOT NULL,
  effective_until DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id, period_id, day_of_week, effective_from)
);

-- School events and holidays
CREATE TABLE school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(20) NOT NULL
    CHECK (event_type IN ('holiday', 'exam', 'event', 'meeting', 'deadline')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  affects_classes JSONB,
  created_by UUID REFERENCES users(id),
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Feature 1 — Learning Paths & Curriculum Builder

### 4.1 How It Works

Teachers build structured learning paths for their subjects using a drag-and-drop curriculum builder. A learning path contains modules (units or chapters), and each module contains items (lessons, videos, files, links, or assignments). Students progress through items sequentially or freely depending on how the teacher configured the path. Completed items unlock the next ones. The teacher sees a real-time progress dashboard showing exactly where each student is in the curriculum.

### 4.2 API Endpoints

```
POST   /api/learning-paths
  Teacher creates a new learning path
  Body: { subject_id, title, description }
  Auth: teacher

GET    /api/learning-paths/subject/:subjectId
  Get all learning paths for a subject
  Auth: teacher, student

GET    /api/learning-paths/:pathId
  Get full path with all modules and items
  Auth: teacher, student

PUT    /api/learning-paths/:pathId
  Update path title, description, published status
  Auth: teacher

DELETE /api/learning-paths/:pathId
  Auth: teacher

POST   /api/learning-paths/:pathId/modules
  Add a module to a path
  Body: { title, description, order_index, unlock_condition, min_score_to_unlock }
  Auth: teacher

PUT    /api/learning-paths/:pathId/modules/reorder
  Reorder modules via drag and drop
  Body: { modules: [{ id, order_index }] }
  Auth: teacher

POST   /api/learning-paths/modules/:moduleId/items
  Add an item to a module
  Body: { title, type, content, file_url, external_url, order_index, is_required, points }
  Auth: teacher

PUT    /api/learning-paths/modules/:moduleId/items/reorder
  Reorder items within a module
  Body: { items: [{ id, order_index }] }
  Auth: teacher

POST   /api/learning-paths/items/:itemId/complete
  Student marks an item as complete
  Body: { score } (optional, for scored items)
  Side effect: awards XP, checks badge criteria, unlocks next item
  Auth: student

GET    /api/learning-paths/:pathId/progress
  Get progress for all students in a path (teacher view)
  Returns: { students: [{ name, completed_items, total_items, percentage }] }
  Auth: teacher

GET    /api/learning-paths/:pathId/my-progress
  Get logged-in student's progress through a path
  Returns: { modules: [{ title, items: [{ title, status, score }] }] }
  Auth: student
```

### 4.3 Drag and Drop Curriculum Builder

```jsx
// components/curriculum/PathBuilder.jsx
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function PathBuilder({ path, onReorder }) {
  function handleDragEnd(result) {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (type === 'MODULE') {
      const reordered = reorderList(path.modules, source.index, destination.index);
      onReorder('modules', reordered.map((m, i) => ({ id: m.id, order_index: i })));
    }

    if (type === 'ITEM') {
      const moduleId = source.droppableId;
      const module = path.modules.find(m => m.id === moduleId);
      const reordered = reorderList(module.items, source.index, destination.index);
      onReorder('items', reordered.map((item, i) => ({ id: item.id, order_index: i })));
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="modules" type="MODULE">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
               className="space-y-4">
            {path.modules.map((module, index) => (
              <Draggable key={module.id} draggableId={module.id} index={index}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps}
                       className="bg-white dark:bg-gray-800 rounded-xl border
                                  border-gray-200 dark:border-gray-700 p-4">
                    <div {...provided.dragHandleProps}
                         className="flex items-center gap-3 mb-3 cursor-grab">
                      <span className="text-gray-400">⠿⠿</span>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {module.title}
                      </h3>
                    </div>
                    <ModuleItems module={module} onReorder={onReorder} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

### 4.4 Student Progress View

```jsx
// components/curriculum/PathProgress.jsx
export default function PathProgress({ modules }) {
  return (
    <div className="space-y-6">
      {modules.map(module => {
        const completed = module.items.filter(i => i.status === 'completed').length;
        const total = module.items.length;
        const pct = Math.round((completed / total) * 100);
        const isLocked = module.unlock_condition === 'sequential'
          && modules[modules.indexOf(module) - 1]?.completion_percentage < 100;

        return (
          <div key={module.id}
               className={`rounded-xl border p-5 ${isLocked
                 ? 'opacity-50 border-gray-200 dark:border-gray-700'
                 : 'border-blue-200 dark:border-blue-800'
               }`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">{module.title}</h3>
              <span className="text-sm text-gray-500">{completed}/{total} completed</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <div className="h-2 bg-blue-500 rounded-full transition-all"
                   style={{ width: `${pct}%` }} />
            </div>
            {!isLocked && (
              <div className="space-y-2">
                {module.items.map(item => (
                  <PathItem key={item.id} item={item} />
                ))}
              </div>
            )}
            {isLocked && (
              <p className="text-sm text-gray-400 text-center py-2">
                Complete the previous module to unlock
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### 4.5 Frontend Pages

```
/teacher/subjects/[subjectId]/paths
  List of learning paths for a subject
  "Create new path" button

/teacher/subjects/[subjectId]/paths/[pathId]/builder
  Drag-and-drop curriculum builder
  Left panel: module list with drag handles
  Right panel: item editor (rich text with Quill.js)
  Publish/unpublish toggle at top

/teacher/subjects/[subjectId]/paths/[pathId]/progress
  Progress dashboard showing each student's completion

/student/paths
  All learning paths assigned to the student across subjects

/student/paths/[pathId]
  Student's view of a single path with progress indicators
  Locked modules shown greyed out with lock icon
```

---

## 5. Feature 2 — Discussion Boards & Class Forums

### 5.1 How It Works

Every subject gets an associated discussion board. Teachers can create multiple boards per subject — a general Q&A board, a homework help board, a debate board. Students post threads and reply to each other. Replies can be upvoted and the teacher can mark one reply as the "accepted answer" (like Stack Overflow). Teachers can pin important threads, lock closed discussions, and moderate posts. Participation in discussions awards XP and counts toward the discussion_participation badge criteria.

### 5.2 API Endpoints

```
POST   /api/discussions/boards
  Create a discussion board
  Body: { subject_id, class_id, title, description, type }
  Auth: teacher, admin

GET    /api/discussions/boards/subject/:subjectId
  Get all boards for a subject
  Auth: teacher, student

GET    /api/discussions/boards/:boardId/threads
  Get all threads in a board (paginated)
  Query: ?page=1&limit=20&sort=latest|popular|unanswered
  Auth: teacher, student

POST   /api/discussions/boards/:boardId/threads
  Create a new thread
  Body: { title, body }
  Side effect: awards XP to student, increments discussion participation count
  Auth: teacher, student

GET    /api/discussions/threads/:threadId
  Get thread with all replies (nested)
  Side effect: increments view count
  Auth: teacher, student

POST   /api/discussions/threads/:threadId/replies
  Post a reply to a thread
  Body: { body, parent_reply_id }
  Side effect: awards XP, sends notification to thread author
  Auth: teacher, student

PUT    /api/discussions/replies/:replyId/upvote
  Toggle upvote on a reply
  Auth: teacher, student

PUT    /api/discussions/replies/:replyId/accept
  Mark reply as accepted answer
  Auth: teacher only

PUT    /api/discussions/threads/:threadId/pin
  Pin or unpin a thread
  Auth: teacher, admin

PUT    /api/discussions/threads/:threadId/lock
  Lock or unlock a thread
  Auth: teacher, admin

DELETE /api/discussions/threads/:threadId
  Delete a thread (own thread or admin/teacher)
  Auth: teacher, admin, original author

DELETE /api/discussions/replies/:replyId
  Delete a reply
  Auth: teacher, admin, original author
```

### 5.3 Rich Text Editor Setup

```jsx
// components/discussion/RichTextEditor.jsx
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'code'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ]
};

export default function RichTextEditor({ value, onChange, placeholder }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200
                    dark:border-gray-700">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || 'Write something...'}
        className="bg-white dark:bg-gray-800"
      />
    </div>
  );
}
```

### 5.4 Thread Card Component

```jsx
// components/discussion/ThreadCard.jsx
export default function ThreadCard({ thread, onClick }) {
  return (
    <div onClick={onClick}
         className="bg-white dark:bg-gray-800 rounded-xl border
                    border-gray-200 dark:border-gray-700 p-4 cursor-pointer
                    hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {thread.is_pinned && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900
                               text-amber-800 dark:text-amber-200
                               px-2 py-0.5 rounded-full">Pinned</span>
            )}
            {thread.has_accepted_answer && (
              <span className="text-xs bg-green-100 dark:bg-green-900
                               text-green-800 dark:text-green-200
                               px-2 py-0.5 rounded-full">Answered</span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {thread.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">
            {thread.preview}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400 shrink-0">
          <div>{thread.reply_count} replies</div>
          <div>{thread.views} views</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <span>{thread.author_name}</span>
        <span>·</span>
        <span>{formatRelativeTime(thread.created_at)}</span>
      </div>
    </div>
  );
}
```

### 5.5 Frontend Pages

```
/discussions
  All boards the logged-in user has access to, grouped by subject

/discussions/[boardId]
  Thread list for a board
  Filter tabs: Latest / Popular / Unanswered
  "New thread" button for students and teachers

/discussions/[boardId]/threads/new
  New thread form with rich text editor

/discussions/[boardId]/threads/[threadId]
  Thread detail with nested replies
  Upvote buttons on replies
  "Accept answer" button visible to thread-creating teacher
  Reply composer at bottom
```

---

## 6. Feature 3 — Student Portfolio & Achievement Badges

### 6.1 How It Works

Every student gets a personal portfolio page where they can showcase their best work — uploaded projects, essays, artwork, certificates, and achievements. They control what's public and what's private. Teachers and admins can award badges manually or the system awards them automatically when criteria are met. Badges are backed by an XP system — every action earns points, points accumulate into levels. The leaderboard (visible within the class, not school-wide) motivates healthy competition. This is inspired by Canvas Badges and Moodle's competency framework.

### 6.2 Badge Criteria Engine

```javascript
// services/badgeEngine.js
async function checkAndAwardBadges(studentId, schoolId, triggerType) {
  const badges = await getActiveBadges(schoolId);
  const eligibleBadges = badges.filter(b => b.criteria_type === triggerType);

  for (const badge of eligibleBadges) {
    const alreadyEarned = await hasStudentEarnedBadge(studentId, badge.id);
    if (alreadyEarned) continue;

    let qualifies = false;

    switch (badge.criteria_type) {
      case 'grade_average':
        const avg = await getStudentOverallAverage(studentId);
        qualifies = avg >= badge.criteria_value;
        break;

      case 'attendance_rate':
        const rate = await getStudentAttendanceRate(studentId);
        qualifies = rate >= badge.criteria_value;
        break;

      case 'path_completion':
        const completedPaths = await getCompletedPathsCount(studentId);
        qualifies = completedPaths >= badge.criteria_value;
        break;

      case 'discussion_participation':
        const posts = await getDiscussionPostCount(studentId);
        qualifies = posts >= badge.criteria_value;
        break;

      case 'streak':
        const streak = await getStudentStreak(studentId);
        qualifies = streak >= badge.criteria_value;
        break;
    }

    if (qualifies) {
      await awardBadge(studentId, badge.id, null, 'Auto-awarded by system');
      await awardXP(studentId, badge.points_value);
      await createNotification(studentId, {
        type: 'badge_earned',
        title: `You earned the "${badge.name}" badge!`,
        body: badge.description
      });
    }
  }
}
```

### 6.3 XP and Level System

```javascript
// services/xpService.js
const XP_REWARDS = {
  assignment_submitted:     10,
  assignment_graded_pass:   20,
  assignment_graded_excel:  40,
  path_item_completed:      15,
  path_completed:           50,
  discussion_post:          10,
  discussion_reply:          8,
  discussion_upvote_received: 5,
  attendance_present:        5,
  daily_login:               3,
  streak_7_days:            25,
  streak_30_days:           100
};

function calculateLevel(totalXP) {
  // Level formula: each level requires 20% more XP than previous
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 220 XP, Level 4: 364 XP...
  let level = 1;
  let required = 100;
  let accumulated = 0;
  while (totalXP >= accumulated + required) {
    accumulated += required;
    required = Math.floor(required * 1.2);
    level++;
  }
  return {
    level,
    currentXP: totalXP - accumulated,
    requiredXP: required,
    percentage: Math.round(((totalXP - accumulated) / required) * 100)
  };
}

async function awardXP(studentId, amount, reason) {
  const xp = await getStudentXP(studentId);
  const newTotal = xp.total_xp + amount;
  const { level } = calculateLevel(newTotal);

  await updateStudentXP(studentId, newTotal, level);

  if (level > xp.level) {
    await createNotification(studentId, {
      type: 'level_up',
      title: `Level up! You reached Level ${level}`,
      body: `Keep going to unlock more achievements.`
    });
  }
}
```

### 6.4 API Endpoints

```
GET    /api/portfolio/:studentId
  Get student's portfolio (public items only if not own profile)
  Auth: all roles

POST   /api/portfolio/items
  Student adds a portfolio item
  Body: multipart/form-data { title, description, type, subject_id, is_public, file }
  Auth: student

PUT    /api/portfolio/items/:itemId
  Update portfolio item
  Auth: student (own items only)

DELETE /api/portfolio/items/:itemId
  Auth: student, admin

GET    /api/badges/school
  Get all badge definitions for the school
  Auth: all roles

POST   /api/badges
  Admin creates a badge definition
  Body: { name, description, icon_emoji, color, criteria_type, criteria_value, points_value }
  Auth: admin

POST   /api/badges/award
  Teacher manually awards a badge to a student
  Body: { student_id, badge_id, note }
  Auth: teacher, admin

GET    /api/badges/student/:studentId
  Get all badges earned by a student
  Auth: all roles

GET    /api/xp/student/:studentId
  Get student XP, level, and progress to next level
  Auth: all roles

GET    /api/xp/leaderboard/:classId
  Get class leaderboard ranked by XP
  Returns top 10 students with level and badge count
  Auth: teacher, student (own class only)
```

### 6.5 Portfolio Page Component

```jsx
// app/student/portfolio/page.jsx
export default function PortfolioPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Student profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border
                      border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900
                          flex items-center justify-center text-3xl font-bold
                          text-blue-600 dark:text-blue-300">
            {student.name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">{student.name}</h1>
            <p className="text-gray-500">{student.class_name}</p>
            <div className="flex items-center gap-4 mt-2">
              <XPBar xp={xpData} />
              <span className="text-sm text-gray-400">
                Level {xpData.level}
              </span>
            </div>
          </div>
        </div>
        {/* Badge showcase */}
        <div className="flex flex-wrap gap-2 mt-4">
          {badges.map(badge => (
            <BadgeChip key={badge.id} badge={badge} />
          ))}
        </div>
      </div>

      {/* Portfolio items grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Portfolio</h2>
          <button onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600
                             text-white hover:bg-blue-700">
            Add item
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 6.6 Frontend Pages

```
/student/portfolio
  Own portfolio with edit controls and add item button

/students/[studentId]/portfolio
  Public view of another student's portfolio (public items only)

/student/badges
  All earned badges with criteria shown for unearned ones
  XP progress bar and level display
  Class leaderboard

/admin/badges
  Badge management: create, edit, deactivate badges
  Award history log

/teacher/classes/[classId]/leaderboard
  Class leaderboard showing top students by XP
  Badge counts shown next to each student
```

---

## 7. Feature 4 — Timetable & Class Scheduling System

### 7.1 How It Works

The school admin builds the master timetable using a visual weekly grid. They define the school's bell schedule (periods with start/end times), then assign subjects to time slots for each class. Teachers see their personal teaching schedule. Students see their class timetable. Parents see their child's daily schedule. The timetable integrates with FullCalendar.js for a polished calendar view. The admin can also add school-wide events, holidays, and exam schedules that appear on everyone's calendar.

### 7.2 API Endpoints

```
POST   /api/timetable/periods
  Admin creates period definitions (bell schedule)
  Body: { name, start_time, end_time, period_number }
  Auth: admin

GET    /api/timetable/periods
  Get all periods for the school
  Auth: all roles

POST   /api/timetable/slots
  Admin assigns a subject to a time slot
  Body: { class_id, subject_id, teacher_id, period_id, day_of_week, room, color, effective_from }
  Validation: check for teacher conflicts (same teacher in two places at same time)
  Auth: admin

GET    /api/timetable/class/:classId
  Get full weekly timetable for a class
  Returns: grid of { day, period, subject, teacher, room }
  Auth: all roles

GET    /api/timetable/teacher/:teacherId
  Get teacher's personal teaching schedule
  Auth: teacher (own), admin

GET    /api/timetable/today/:classId
  Get today's schedule for a class
  Auth: all roles

DELETE /api/timetable/slots/:slotId
  Remove a slot from the timetable
  Auth: admin

POST   /api/events
  Admin creates a school event or holiday
  Body: { title, description, event_type, start_date, end_date, affects_classes, color }
  Auth: admin

GET    /api/events
  Get all events for the school
  Query: ?from=2025-01-01&to=2025-06-30
  Returns calendar-ready event objects
  Auth: all roles

PUT    /api/events/:eventId
  Auth: admin

DELETE /api/events/:eventId
  Auth: admin
```

### 7.3 Conflict Detection

```javascript
// services/timetableService.js
async function checkTeacherConflict(teacherId, periodId, dayOfWeek, effectiveFrom, excludeSlotId) {
  const existing = await prisma.timetableSlot.findFirst({
    where: {
      teacher_id: teacherId,
      period_id: periodId,
      day_of_week: dayOfWeek,
      effective_from: { lte: effectiveFrom },
      OR: [
        { effective_until: null },
        { effective_until: { gte: effectiveFrom } }
      ],
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {})
    }
  });
  return existing !== null;
}

async function checkClassConflict(classId, periodId, dayOfWeek, effectiveFrom, excludeSlotId) {
  const existing = await prisma.timetableSlot.findFirst({
    where: {
      class_id: classId,
      period_id: periodId,
      day_of_week: dayOfWeek,
      effective_from: { lte: effectiveFrom },
      OR: [
        { effective_until: null },
        { effective_until: { gte: effectiveFrom } }
      ],
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {})
    }
  });
  return existing !== null;
}
```

### 7.4 FullCalendar Integration

```jsx
// components/timetable/WeeklyTimetable.jsx
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function WeeklyTimetable({ slots, events, onSlotClick, editable }) {
  const calendarEvents = [
    // Convert timetable slots to FullCalendar recurring events
    ...slots.map(slot => ({
      id: slot.id,
      title: `${slot.subject_name}\n${slot.room || ''}`,
      daysOfWeek: [slot.day_of_week],
      startTime: slot.period.start_time,
      endTime: slot.period.end_time,
      backgroundColor: slot.color || '#3b82f6',
      borderColor: slot.color || '#2563eb',
      extendedProps: { type: 'class', slot }
    })),
    // One-off school events
    ...events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_date,
      end: event.end_date,
      backgroundColor: event.color || '#8b5cf6',
      extendedProps: { type: 'event', event }
    }))
  ];

  return (
    <FullCalendar
      plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay,dayGridMonth'
      }}
      events={calendarEvents}
      editable={editable}
      slotMinTime="07:00:00"
      slotMaxTime="18:00:00"
      allDaySlot={false}
      weekends={false}
      eventClick={(info) => onSlotClick && onSlotClick(info.event)}
      height="auto"
      locale="en"
    />
  );
}
```

### 7.5 Admin Timetable Builder

```jsx
// app/admin/timetable/builder/page.jsx
// Visual grid builder: rows = periods, columns = days of week
// Each cell is droppable: drag a subject card into a cell
// Color picker per slot
// Conflict warnings shown inline in red
// "Save timetable" publishes to all affected classes
```

### 7.6 Frontend Pages

```
/admin/timetable
  Master timetable overview showing all classes

/admin/timetable/builder
  Visual drag-and-drop timetable builder
  Left panel: subject list to drag from
  Main panel: weekly grid
  Conflict warnings shown in real time

/admin/timetable/periods
  Bell schedule management (add/edit/delete periods)

/admin/events
  School events and holidays calendar management

/teacher/timetable
  Teacher's personal weekly teaching schedule via FullCalendar

/parent/children/[studentId]/timetable
  Child's weekly timetable view

/student/timetable
  Own weekly timetable
  Today's schedule highlighted

/calendar
  School-wide event calendar visible to all roles
  Filters: show holidays, exams, deadlines, meetings
```

---

## 8. XP Integration Across All Phase 6 Features

Every action across all Phase 6 features feeds into the XP system:

```javascript
// Called after every relevant user action
// learning path item completed      → +15 XP
// learning path completed           → +50 XP
// discussion thread posted          → +10 XP
// discussion reply posted           → +8 XP
// discussion reply upvoted          → +5 XP
// portfolio item added              → +12 XP
// badge earned                      → badge.points_value XP
// daily login streak (each day)     → +3 XP
// 7-day streak milestone            → +25 XP
// 30-day streak milestone           → +100 XP
```

Badge auto-award triggers are called after:
- Grade recalculation (for grade_average badge)
- Attendance marking (for attendance_rate badge)
- Path item completion (for path_completion badge)
- Discussion post/reply (for discussion_participation badge)
- Daily login (for streak badge)

---

## 9. Notification Events (Phase 6 Additions)

```javascript
// New notification types to add to existing notification system
'badge_earned'           → student receives when auto-awarded a badge
'level_up'              → student receives when reaching a new XP level
'discussion_reply'       → thread author notified when someone replies
'discussion_upvote'      → reply author notified when upvoted
'answer_accepted'        → reply author notified when marked as accepted
'path_unlocked'         → student notified when next module unlocks
'timetable_change'      → class notified when timetable slot is changed
'event_reminder'        → all users notified 1 day before school event
```

---

## 10. Updated Environment Variables

```env
# Existing from all previous phases
DATABASE_URL=postgresql://...
JWT_SECRET=...
AI_SERVICE_URL=...
DAILY_API_KEY=...
OPENAI_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
FCM_PROJECT_ID=...

# New in Phase 6
FULLCALENDAR_LICENSE_KEY=CC-Attribution-NonCommercial-NoDerivatives
# (free for non-commercial use — use this key exactly as shown)
```

---

## 11. Updated Folder Structure (New Files Only)

```
/backend
  /src
    /routes
      learningPaths.js          ← NEW
      discussions.js            ← NEW
      portfolio.js              ← NEW
      badges.js                 ← NEW
      timetable.js              ← NEW
      events.js                 ← NEW
      xp.js                     ← NEW
    /controllers
      learningPathController.js ← NEW
      discussionController.js   ← NEW
      portfolioController.js    ← NEW
      badgeController.js        ← NEW
      timetableController.js    ← NEW
      eventController.js        ← NEW
      xpController.js           ← NEW
    /services
      badgeEngine.js            ← NEW
      xpService.js              ← NEW
      timetableService.js       ← NEW
      conflictDetector.js       ← NEW

/frontend
  /app
    /discussions                ← NEW
      /[boardId]
        /threads
          /[threadId]
    /student
      /portfolio                ← NEW
      /badges                   ← NEW
      /timetable                ← NEW
      /paths                    ← NEW
    /teacher
      /timetable                ← NEW
      /subjects/[id]/paths      ← NEW
    /parent
      /children/[id]/timetable  ← NEW
    /admin
      /timetable                ← NEW
      /timetable/builder        ← NEW
      /timetable/periods        ← NEW
      /events                   ← NEW
      /badges                   ← NEW
    /calendar                   ← NEW
  /components
    /curriculum
      PathBuilder.jsx           ← NEW
      PathProgress.jsx          ← NEW
      PathItem.jsx              ← NEW
      ModuleCard.jsx            ← NEW
    /discussion
      ThreadCard.jsx            ← NEW
      ReplyCard.jsx             ← NEW
      RichTextEditor.jsx        ← NEW
    /portfolio
      PortfolioCard.jsx         ← NEW
      BadgeChip.jsx             ← NEW
      XPBar.jsx                 ← NEW
    /timetable
      WeeklyTimetable.jsx       ← NEW
      TimetableBuilder.jsx      ← NEW
      PeriodManager.jsx         ← NEW
```

---

## 12. Important Notes for Claude Code

1. **Do not touch any Phase 1–5 files** unless extending them to add new notification types or XP triggers
2. **Badge engine must be called as a side effect** inside existing controllers — after `recalculateFinalGrade`, after attendance marking, after grade entry — not as a separate job
3. **FullCalendar free license** covers non-commercial use — use the exact key `CC-Attribution-NonCommercial-NoDerivatives`
4. **Learning path drag and drop uses `@hello-pangea/dnd`** which is the maintained fork of `react-beautiful-dnd` — do not use the original deprecated package
5. **Rich text from Quill must be sanitized** before storing in the database — use `DOMPurify` on the backend: `npm install isomorphic-dompurify`
6. **Timetable conflict detection must run before saving** any slot — return a 409 Conflict error with a descriptive message if teacher or class has a clash
7. **XP and badge checks are non-blocking** — run them with `Promise.resolve().then(() => checkAndAwardBadges(...))` so they don't slow down the main request
8. **Portfolio file thumbnails** must be generated automatically on upload using Sharp — resize to 400x300 and store as a separate `thumbnail_url`
9. **Discussion body must be stored as HTML** from Quill — render with `dangerouslySetInnerHTML` on the frontend but always sanitize server-side first

---

## 13. Acceptance Criteria (Definition of Done)

**Learning Paths:**
- [ ] Teacher can create a path with modules and items using drag-and-drop
- [ ] Items reorder correctly when dragged within and between modules
- [ ] Student sees locked modules when sequential unlock is enabled
- [ ] Completing an item awards XP and triggers badge check
- [ ] Teacher progress dashboard shows per-student completion percentage
- [ ] Rich text lesson content renders correctly for students

**Discussion Boards:**
- [ ] Each subject has at least one discussion board
- [ ] Students and teachers can post threads with rich text
- [ ] Replies are nested correctly (reply to a reply)
- [ ] Upvoting works and prevents double voting
- [ ] Teacher can mark an accepted answer (highlighted in green)
- [ ] Pinned threads appear at top of board
- [ ] Thread author notified when someone replies
- [ ] Posting a thread awards XP

**Portfolio & Badges:**
- [ ] Student can add portfolio items with file upload and thumbnail generation
- [ ] Public/private toggle works — private items not visible to others
- [ ] Admin can create badge definitions with criteria
- [ ] System auto-awards badges when criteria are met
- [ ] Teacher can manually award badges with a note
- [ ] XP accumulates correctly across all actions
- [ ] Level-up notification sent when student reaches new level
- [ ] Class leaderboard shows correct ranking by XP

**Timetable & Scheduling:**
- [ ] Admin can define bell schedule (periods)
- [ ] Admin can assign subjects to time slots via drag-and-drop builder
- [ ] Teacher conflict detection prevents double-booking
- [ ] Class conflict detection prevents double-booking
- [ ] Teacher sees own weekly schedule via FullCalendar
- [ ] Students and parents see class timetable
- [ ] Admin can create school events visible on all calendars
- [ ] Event reminder notifications sent 1 day before event
- [ ] Timetable change notification sent to affected class

---

That's your complete Phase 6 PRD, Ahmad. This phase is what separates your platform from a simple school management tool and puts it in the same league as Canvas, Moodle, and Blackboard. The combination of structured learning paths, collaborative discussion boards, student portfolios with gamified badges, and a full timetable system covers everything the top university LMS platforms offer — but built specifically for your market and your stack. Paste this directly into Claude Code with your repo and it will handle the rest.