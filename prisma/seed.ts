import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据...');

  // 清空现有数据（按依赖顺序）
  await prisma.semesterReport.deleteMany();
  await prisma.careerProfile.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.score.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.user.deleteMany();

  // ========== 创建年级 ==========
  const grade10 = await prisma.grade.create({
    data: { name: '高一', level: 1 },
  });
  const grade11 = await prisma.grade.create({
    data: { name: '高二', level: 2 },
  });
  const grade12 = await prisma.grade.create({
    data: { name: '高三', level: 3 },
  });

  // ========== 创建班级 ==========
  const classes10 = await Promise.all(
    ['1班', '2班', '3班'].map((name) =>
      prisma.class.create({ data: { name, gradeId: grade10.id } })
    )
  );
  const classes11 = await Promise.all(
    ['1班', '2班', '3班'].map((name) =>
      prisma.class.create({ data: { name, gradeId: grade11.id } })
    )
  );
  const classes12 = await Promise.all(
    ['1班', '2班', '3班'].map((name) =>
      prisma.class.create({ data: { name, gradeId: grade12.id } })
    )
  );

  const allClasses = [...classes10, ...classes11, ...classes12];

  // ========== 创建管理员 ==========
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@xinfuxue.edu',
      password: adminPassword,
      name: '系统管理员',
      role: 'ADMIN',
    },
  });

  // ========== 创建教师 ==========
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teachers = [];

  // 班主任
  const homeroomTeachers = ['王老师', '李老师', '张老师'];
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({
      data: {
        email: `teacher${i + 1}@xinfuxue.edu`,
        password: teacherPassword,
        name: homeroomTeachers[i],
        role: 'TEACHER',
        teacher: {
          create: {
            name: homeroomTeachers[i],
            teacherRole: 'HOMEROOM',
            subjects: JSON.stringify(['语文']),
          },
        },
      },
      include: { teacher: true },
    });
    teachers.push(user.teacher!);
  }

  // 学科教师
  const subjectTeachers = [
    { name: '刘老师', subjects: ['数学'] },
    { name: '陈老师', subjects: ['英语'] },
    { name: '赵老师', subjects: ['物理', '化学'] },
    { name: '孙老师', subjects: ['生物'] },
  ];
  for (let i = 0; i < subjectTeachers.length; i++) {
    const user = await prisma.user.create({
      data: {
        email: `subject${i + 1}@xinfuxue.edu`,
        password: teacherPassword,
        name: subjectTeachers[i].name,
        role: 'TEACHER',
        teacher: {
          create: {
            name: subjectTeachers[i].name,
            teacherRole: 'SUBJECT',
            subjects: JSON.stringify(subjectTeachers[i].subjects),
          },
        },
      },
      include: { teacher: true },
    });
    teachers.push(user.teacher!);
  }

  // 心理老师
  const psychUser = await prisma.user.create({
    data: {
      email: 'psych@xinfuxue.edu',
      password: teacherPassword,
      name: '周心理',
      role: 'TEACHER',
      teacher: {
        create: {
          name: '周心理',
          teacherRole: 'PSYCHOLOGY',
          subjects: JSON.stringify(['心理辅导']),
        },
      },
    },
    include: { teacher: true },
  });
  teachers.push(psychUser.teacher!);

  // 职业规划老师
  const careerUser = await prisma.user.create({
    data: {
      email: 'career@xinfuxue.edu',
      password: teacherPassword,
      name: '吴规划',
      role: 'TEACHER',
      teacher: {
        create: {
          name: '吴规划',
          teacherRole: 'CAREER',
          subjects: JSON.stringify(['职业规划']),
        },
      },
    },
    include: { teacher: true },
  });
  teachers.push(careerUser.teacher!);

  // ========== 绑定教师班级关系 ==========
  for (let i = 0; i < 3; i++) {
    await prisma.teacherClass.create({
      data: {
        teacherId: teachers[i].id,
        classId: classes10[i].id,
        isHomeroom: true,
      },
    });
    await prisma.teacherClass.create({
      data: {
        teacherId: teachers[i].id,
        classId: classes11[i].id,
        isHomeroom: true,
      },
    });
    await prisma.teacherClass.create({
      data: {
        teacherId: teachers[i].id,
        classId: classes12[i].id,
        isHomeroom: true,
      },
    });
  }

  for (let i = 3; i < 7; i++) {
    await prisma.teacherClass.create({
      data: {
        teacherId: teachers[i].id,
        classId: allClasses[(i - 3) % allClasses.length].id,
        isHomeroom: false,
      },
    });
  }

  // ========== 创建学生 ==========
  const studentNames = [
    '张明', '李华', '王芳', '刘洋', '陈静',
    '赵强', '孙丽', '周杰', '吴敏', '郑伟',
    '钱红', '冯磊', '陈浩', '林娜', '黄涛',
    '何雪', '高明', '梁辉', '宋佳', '罗宇',
    '马超', '朱琳', '胡军', '郭鑫', '徐萍',
  ];

  const studentPassword = await bcrypt.hash('student123', 10);
  const createdStudents = [];

  for (let i = 0; i < studentNames.length; i++) {
    const classObj = allClasses[i % allClasses.length];
    const gender = i % 3 === 0 ? 'FEMALE' : 'MALE';

    const user = await prisma.user.create({
      data: {
        email: `student${i + 1}@xinfuxue.edu`,
        password: studentPassword,
        name: studentNames[i],
        role: 'STUDENT',
        student: {
          create: {
            name: studentNames[i],
            studentNo: `2024${String(i + 1).padStart(3, '0')}`,
            gender,
            classId: classObj.id,
            enrollmentDate: new Date('2024-09-01'),
            graduationYear: 2027,
            status: 'ENROLLED',
          },
        },
      },
      include: { student: true },
    });
    createdStudents.push(user.student!);
  }

  // ========== 创建生涯档案 ==========
  for (const student of createdStudents) {
    const isZhangMing = student.name === '张明';
    await prisma.careerProfile.create({
      data: {
        studentId: student.id,
        fiveDimensions: JSON.stringify(isZhangMing ? {
          学业: 82,
          心理: 78,
          职业: 65,
          社交: 88,
          特长: 75,
        } : {
          学业: Math.floor(Math.random() * 40) + 60,
          心理: Math.floor(Math.random() * 30) + 70,
          职业: Math.floor(Math.random() * 50) + 50,
          社交: Math.floor(Math.random() * 40) + 60,
          特长: Math.floor(Math.random() * 50) + 50,
        }),
        dimensionHistory: JSON.stringify([]),
        totalScore: isZhangMing ? 245 : Math.floor(Math.random() * 200) + 100,
        level: isZhangMing ? 3 : 1,
        unlockedItems: JSON.stringify(isZhangMing ? ['基础空间', '成长书架', '荣誉墙'] : ['基础空间']),
        goals: JSON.stringify(isZhangMing ? [
          { title: '数学成绩提升至90分以上', deadline: '2025-06-30' },
          { title: '参加英语演讲比赛', deadline: '2025-04-15' },
        ] : []),
      },
    });
  }

  // ========== 创建评语 ==========
  const sampleComments = [
    '该生学习态度端正，作业完成情况良好，课堂参与度较高。',
    '本学期进步明显，特别是在小组讨论中展现了出色的表达能力。',
    '基础知识扎实，但在难题突破方面还需加强练习。',
    '性格开朗，与同学相处融洽，是班级活动的积极分子。',
    '学习自觉性有待提高，希望能更加主动地思考问题。',
    '在科技节项目中展现了创新思维，获得了评委的一致好评。',
    '英语阅读能力较强，建议继续保持每天的阅读习惯。',
    '数学逻辑思维清晰，经常能提出独特的解题思路。',
  ];

  const homeroomTeacherIds = teachers.slice(0, 3).map((t) => t.id);
  const subjectTeacherIds = teachers.slice(3, 7).map((t) => t.id);

  for (const student of createdStudents) {
    const htId = homeroomTeacherIds[createdStudents.indexOf(student) % homeroomTeacherIds.length];
    await prisma.comment.create({
      data: {
        studentId: student.id,
        teacherId: htId,
        type: 'HOMEROOM',
        content: sampleComments[Math.floor(Math.random() * sampleComments.length)],
        semester: '2024-2025-1',
        isPinned: Math.random() > 0.7,
      },
    });

    const stId = subjectTeacherIds[Math.floor(Math.random() * subjectTeacherIds.length)];
    await prisma.comment.create({
      data: {
        studentId: student.id,
        teacherId: stId,
        type: 'SUBJECT',
        content: sampleComments[Math.floor(Math.random() * sampleComments.length)],
        semester: '2024-2025-1',
      },
    });
  }

  // ========== 创建成绩 ==========
  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
  for (const student of createdStudents) {
    for (const subject of subjects) {
      await prisma.score.create({
        data: {
          studentId: student.id,
          subject,
          examType: 'MONTHLY',
          score: Math.floor(Math.random() * 40) + 60,
          total: 100,
          semester: '2024-2025-1',
          examDate: new Date('2024-10-15'),
        },
      });
    }
  }

  // ========== 创建里程碑 ==========
  const milestoneTitles = [
    '首次月考进入班级前10',
    '参加英语演讲比赛',
    '加入机器人社团',
    '完成心理健康测评',
    '获得三好学生称号',
    '担任班级学习委员',
    '参加研学旅行',
    '运动会跳高第三名',
  ];

  const milestoneTypes = ['ACADEMIC', 'ACTIVITY', 'COMPETITION', 'PSYCHOLOGY', 'PERSONAL', 'GROWTH'];

  for (const student of createdStudents) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      await prisma.milestone.create({
        data: {
          studentId: student.id,
          type: milestoneTypes[Math.floor(Math.random() * milestoneTypes.length)],
          title: milestoneTitles[Math.floor(Math.random() * milestoneTitles.length)],
          description: '系统自动记录的里程碑事件',
          source: 'AUTO',
          status: 'APPROVED',
          occurredAt: new Date(2024, 9, Math.floor(Math.random() * 28) + 1),
        },
      });
    }
  }

  // ========== 创建活动记录 ==========
  const activityList = [
    { name: '秋季运动会', category: 'SPORTS', type: 'INTERNAL' },
    { name: '科技节创新大赛', category: 'COMPETITION', type: 'INTERNAL' },
    { name: '英语角活动', category: 'CLUB', type: 'INTERNAL' },
    { name: '社区志愿服务', category: 'VOLUNTEER', type: 'EXTERNAL' },
    { name: '春季研学', category: 'STUDY_TOUR', type: 'EXTERNAL' },
  ];

  for (const student of createdStudents) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const activity = activityList[Math.floor(Math.random() * activityList.length)];
      await prisma.activity.create({
        data: {
          studentId: student.id,
          name: activity.name,
          category: activity.category,
          type: activity.type,
          role: ['参与者', '组织者', '获奖者'][Math.floor(Math.random() * 3)],
          result: Math.random() > 0.5 ? '表现优秀' : null,
          startDate: new Date(2024, 9, Math.floor(Math.random() * 28) + 1),
          status: 'APPROVED',
          points: Math.floor(Math.random() * 20) + 10,
        },
      });
    }
  }

  // ========== 为张明（第一个学生）添加丰富数据 ==========
  const zhangMing = createdStudents[0];
  const zhangMingId = zhangMing.id;

  // 额外评语
  const zhangMingComments = [
    { teacherId: homeroomTeacherIds[0], type: 'HOMEROOM', content: '张明同学本学期表现非常出色，不仅学业成绩稳步提升，在班级活动中也展现了优秀的组织能力。作为学习委员，他主动帮助同学解答难题，带动了班级的学习氛围。希望下学期能继续保持，在弱势科目上多下功夫。', semester: '2024-2025-1' },
    { teacherId: subjectTeacherIds[0], type: 'SUBJECT', content: '数学思维敏捷，解题思路清晰，尤其擅长几何证明题。期末考试成绩优异，位列班级前列。建议继续保持练习量，挑战更高难度的题目。', semester: '2024-2025-1' },
    { teacherId: subjectTeacherIds[1], type: 'SUBJECT', content: '英语口语表达流畅，词汇量丰富，在课堂讨论中经常能提出独到见解。英语作文结构清晰，语言地道，是本班的英语学习标杆。', semester: '2024-2025-1' },
  ];
  for (const c of zhangMingComments) {
    await prisma.comment.create({ data: { ...c, studentId: zhangMingId, isPinned: false } });
  }

  // 额外成绩（多学期、多次考试）
  const zhangMingScores = [
    // 2024-2025-1 学期：月考1
    { subject: '语文', examType: 'MONTHLY', score: 78, total: 100, semester: '2024-2025-1', examDate: new Date('2024-10-15'), classRank: 8, gradeRank: 45 },
    { subject: '数学', examType: 'MONTHLY', score: 92, total: 100, semester: '2024-2025-1', examDate: new Date('2024-10-15'), classRank: 2, gradeRank: 12 },
    { subject: '英语', examType: 'MONTHLY', score: 88, total: 100, semester: '2024-2025-1', examDate: new Date('2024-10-15'), classRank: 3, gradeRank: 18 },
    { subject: '物理', examType: 'MONTHLY', score: 85, total: 100, semester: '2024-2025-1', examDate: new Date('2024-10-15'), classRank: 4, gradeRank: 22 },
    { subject: '化学', examType: 'MONTHLY', score: 76, total: 100, semester: '2024-2025-1', examDate: new Date('2024-10-15'), classRank: 12, gradeRank: 56 },
    { subject: '生物', examType: 'MONTHLY', score: 82, total: 100, semester: '2024-2025-1', examDate: new Date('2024-10-15'), classRank: 6, gradeRank: 34 },
    // 期中考试
    { subject: '语文', examType: 'MIDTERM', score: 82, total: 100, semester: '2024-2025-1', examDate: new Date('2024-11-10'), classRank: 6, gradeRank: 38 },
    { subject: '数学', examType: 'MIDTERM', score: 95, total: 100, semester: '2024-2025-1', examDate: new Date('2024-11-10'), classRank: 1, gradeRank: 5 },
    { subject: '英语', examType: 'MIDTERM', score: 90, total: 100, semester: '2024-2025-1', examDate: new Date('2024-11-10'), classRank: 2, gradeRank: 10 },
    { subject: '物理', examType: 'MIDTERM', score: 88, total: 100, semester: '2024-2025-1', examDate: new Date('2024-11-10'), classRank: 3, gradeRank: 15 },
    { subject: '化学', examType: 'MIDTERM', score: 80, total: 100, semester: '2024-2025-1', examDate: new Date('2024-11-10'), classRank: 8, gradeRank: 42 },
    { subject: '生物', examType: 'MIDTERM', score: 85, total: 100, semester: '2024-2025-1', examDate: new Date('2024-11-10'), classRank: 5, gradeRank: 28 },
    // 月考2
    { subject: '语文', examType: 'MONTHLY', score: 80, total: 100, semester: '2024-2025-1', examDate: new Date('2024-12-20'), classRank: 7, gradeRank: 40 },
    { subject: '数学', examType: 'MONTHLY', score: 90, total: 100, semester: '2024-2025-1', examDate: new Date('2024-12-20'), classRank: 3, gradeRank: 14 },
    { subject: '英语', examType: 'MONTHLY', score: 89, total: 100, semester: '2024-2025-1', examDate: new Date('2024-12-20'), classRank: 2, gradeRank: 11 },
    { subject: '物理', examType: 'MONTHLY', score: 86, total: 100, semester: '2024-2025-1', examDate: new Date('2024-12-20'), classRank: 4, gradeRank: 20 },
    { subject: '化学', examType: 'MONTHLY', score: 78, total: 100, semester: '2024-2025-1', examDate: new Date('2024-12-20'), classRank: 10, gradeRank: 50 },
    { subject: '生物', examType: 'MONTHLY', score: 84, total: 100, semester: '2024-2025-1', examDate: new Date('2024-12-20'), classRank: 5, gradeRank: 30 },
    // 期末考试
    { subject: '语文', examType: 'FINAL', score: 85, total: 100, semester: '2024-2025-1', examDate: new Date('2025-01-15'), classRank: 5, gradeRank: 32 },
    { subject: '数学', examType: 'FINAL', score: 93, total: 100, semester: '2024-2025-1', examDate: new Date('2025-01-15'), classRank: 2, gradeRank: 8 },
    { subject: '英语', examType: 'FINAL', score: 91, total: 100, semester: '2024-2025-1', examDate: new Date('2025-01-15'), classRank: 2, gradeRank: 9 },
    { subject: '物理', examType: 'FINAL', score: 89, total: 100, semester: '2024-2025-1', examDate: new Date('2025-01-15'), classRank: 3, gradeRank: 16 },
    { subject: '化学', examType: 'FINAL', score: 82, total: 100, semester: '2024-2025-1', examDate: new Date('2025-01-15'), classRank: 7, gradeRank: 38 },
    { subject: '生物', examType: 'FINAL', score: 87, total: 100, semester: '2024-2025-1', examDate: new Date('2025-01-15'), classRank: 4, gradeRank: 24 },
  ];
  for (const s of zhangMingScores) {
    await prisma.score.create({ data: { ...s, studentId: zhangMingId } });
  }

  // 额外里程碑
  const zhangMingMilestones = [
    { type: 'ACADEMIC', title: '期中考试数学单科第一', description: '期中考试中数学取得满分', occurredAt: new Date('2024-11-10') },
    { type: 'COMPETITION', title: '校英语演讲比赛二等奖', description: '在学校英语演讲比赛中表现优异', occurredAt: new Date('2024-10-20') },
    { type: 'ACTIVITY', title: '加入学校机器人社团', description: '成功入选机器人社团核心成员', occurredAt: new Date('2024-09-15') },
    { type: 'GROWTH', title: '被评为班级学习委员', description: '全班投票当选学习委员', occurredAt: new Date('2024-09-05') },
    { type: 'COMPETITION', title: '数学竞赛校级选拔赛进入决赛', description: '在数学竞赛选拔赛中脱颖而出', occurredAt: new Date('2024-12-01') },
    { type: 'ACTIVITY', title: '组织班级元旦联欢会', description: '担任元旦联欢会总策划', occurredAt: new Date('2024-12-28') },
  ];
  for (const m of zhangMingMilestones) {
    await prisma.milestone.create({
      data: { ...m, studentId: zhangMingId, source: 'AUTO', status: 'APPROVED' },
    });
  }

  // 额外活动
  const zhangMingActivities = [
    { name: '秋季运动会', category: 'SPORTS', type: 'INTERNAL', role: '参与者', points: 15, startDate: new Date('2024-10-15'), result: '4×100米接力第三名' },
    { name: '科技节创新大赛', category: 'COMPETITION', type: 'INTERNAL', role: '获奖者', points: 30, startDate: new Date('2024-11-05'), result: '智能小车项目一等奖' },
    { name: '英语角活动', category: 'CLUB', type: 'INTERNAL', role: '组织者', points: 20, startDate: new Date('2024-09-20'), result: null },
    { name: '社区志愿服务', category: 'VOLUNTEER', type: 'EXTERNAL', role: '参与者', points: 25, startDate: new Date('2024-11-20'), result: '累计服务20小时' },
    { name: '春季研学', category: 'STUDY_TOUR', type: 'EXTERNAL', role: '参与者', points: 18, startDate: new Date('2025-03-10'), result: null },
    { name: '校园歌手大赛', category: 'SPORTS', type: 'INTERNAL', role: '参与者', points: 12, startDate: new Date('2024-12-10'), result: '十佳歌手' },
  ];
  for (const a of zhangMingActivities) {
    await prisma.activity.create({
      data: { ...a, studentId: zhangMingId, status: 'APPROVED' },
    });
  }

  // 心情记录
  const zhangMingMoods = [
    { rating: 4, note: '今天数学课解出了超难的题目，很有成就感！', date: new Date('2025-01-10') },
    { rating: 3, note: '今天有点累，作业好多', date: new Date('2025-01-09') },
    { rating: 5, note: '英语演讲比赛获奖了，太开心了！', date: new Date('2025-01-08') },
    { rating: 4, note: '和同学们一起准备元旦联欢会，很有意思', date: new Date('2025-01-07') },
    { rating: 2, note: '化学考试没考好，有点沮丧', date: new Date('2025-01-06') },
    { rating: 4, note: '老师鼓励我不要灰心，下次会更好', date: new Date('2025-01-05') },
    { rating: 3, note: '平平淡淡的一天', date: new Date('2025-01-04') },
    { rating: 4, note: '物理实验课很有趣', date: new Date('2025-01-03') },
    { rating: 5, note: '期末考完了，终于可以放松一下', date: new Date('2025-01-02') },
    { rating: 4, note: '复习了一整天，感觉准备充分', date: new Date('2025-01-01') },
  ];
  for (const m of zhangMingMoods) {
    await prisma.moodEntry.create({
      data: { ...m, studentId: zhangMingId },
    });
  }

  console.log('✅ 种子数据完成！');
  console.log(`📊 统计：${allClasses.length} 个班级, ${teachers.length} 位教师, ${createdStudents.length} 名学生`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
