// js/analytics.js

function renderDashboard() {
    const totalProjects = currentProjects.length;
    const activeProjects = currentProjects.filter(p => p.status === "진행 중").length;
    const completedProjects = currentProjects.filter(p => p.status === "완료됨").length;

    const totalTasks = currentTasks.length;
    const completedTasks = currentTasks.filter(t => t.status === "Done").length;
    const pendingTasks = totalTasks - completedTasks;

    // 1. 평균 프로젝트 진행률 계산
    let avgProgress = 0;
    if (totalProjects > 0) {
        const sumPercent = currentProjects.reduce((sum, p) => {
            const prog = typeof getProjectProgress === 'function' ? getProjectProgress(p.id).percent : 0;
            return sum + prog;
        }, 0);
        avgProgress = Math.round(sumPercent / totalProjects);
    }

    // 2. 미완료 작업 중 지연 작업과 마감 임박 작업 분류 (완료된 작업은 절대 지연 목록에 포함하지 않음)
    const overdueTasks = [];
    const urgentTasks = [];

    currentTasks.forEach(task => {
        if (task.status === 'Done') return;
        const diff = getDueDateDiff(task.due_date);
        if (diff === null) return;
        if (diff < 0) {
            overdueTasks.push({ task, diff });
        } else if (diff <= 3) {
            urgentTasks.push({ task, diff });
        }
    });

    // 지연 작업: 지연일수 큰 순서 (diff 오름차순, e.g. -5 -> -1)
    overdueTasks.sort((a, b) => a.diff - b.diff);

    // 마감 임박 작업: 마감일 가까운 순서 (diff 오름차순, e.g. 0 -> 1 -> 2 -> 3)
    urgentTasks.sort((a, b) => a.diff - b.diff);

    // 3. 상단 통계 수치 갱신
    const elStatTotal = document.getElementById("stat-total");
    if (elStatTotal) elStatTotal.textContent = totalProjects;

    const elStatActive = document.getElementById("stat-active");
    if (elStatActive) elStatActive.textContent = activeProjects;

    const elStatDone = document.getElementById("stat-done");
    if (elStatDone) elStatDone.textContent = completedProjects;

    const elStatTasksTotal = document.getElementById("stat-tasks-total");
    if (elStatTasksTotal) elStatTasksTotal.textContent = totalTasks;

    const elStatTasksDone = document.getElementById("stat-tasks-done");
    if (elStatTasksDone) elStatTasksDone.textContent = completedTasks;

    const elStatTasksPending = document.getElementById("stat-tasks-pending");
    if (elStatTasksPending) elStatTasksPending.textContent = pendingTasks;

    const elStatTasksLegacy = document.getElementById("stat-tasks");
    if (elStatTasksLegacy) elStatTasksLegacy.textContent = `${pendingTasks} / ${totalTasks}`;

    const elStatAvgProgress = document.getElementById("stat-avg-progress");
    if (elStatAvgProgress) elStatAvgProgress.textContent = `${avgProgress}%`;

    const elStatAvgBar = document.getElementById("stat-avg-progress-bar");
    if (elStatAvgBar) elStatAvgBar.style.width = `${avgProgress}%`;

    const elStatAlertTotal = document.getElementById("stat-alert-total");
    if (elStatAlertTotal) elStatAlertTotal.textContent = overdueTasks.length + urgentTasks.length;

    const elStatOverdue = document.getElementById("stat-overdue-count");
    if (elStatOverdue) elStatOverdue.textContent = overdueTasks.length;

    const elStatUrgent = document.getElementById("stat-urgent-count");
    if (elStatUrgent) elStatUrgent.textContent = urgentTasks.length;

    const elBadgeOverdue = document.getElementById("badge-overdue-count");
    if (elBadgeOverdue) elBadgeOverdue.textContent = overdueTasks.length;

    const elBadgeUrgent = document.getElementById("badge-urgent-count");
    if (elBadgeUrgent) elBadgeUrgent.textContent = urgentTasks.length;

    // 4. 진행 중인 프로젝트 렌더링
    const activeProjsContainer = document.getElementById('dashboard-active-projects');
    if (activeProjsContainer) {
        activeProjsContainer.innerHTML = '';
        const activeList = currentProjects.filter(p => p.status === '진행 중');
        if (activeList.length === 0) {
            activeProjsContainer.innerHTML = `
                <div class="dashboard-empty" style="grid-column: 1 / -1;">
                    <i class="fas fa-folder-open"></i>
                    <p>현재 진행 중인 프로젝트가 없습니다.<br><span style="font-size: 0.8rem; opacity: 0.7;">새 프로젝트를 시작하거나 기존 프로젝트의 상태를 '진행 중'으로 변경해보세요.</span></p>
                </div>`;
        } else {
            activeList.forEach(proj => {
                const { percent, completed, total } = typeof getProjectProgress === 'function'
                    ? getProjectProgress(proj.id)
                    : { percent: 0, completed: 0, total: 0 };
                const diff = getDueDateDiff(proj.due_date);
                const ddayText = diff === null ? '기한 없음' : (diff > 0 ? `D-${diff}` : (diff === 0 ? 'D-Day' : `D+${Math.abs(diff)} 지연`));
                const ddayColor = diff === null ? 'bg-default' : (diff > 0 ? 'bg-info' : (diff === 0 ? 'bg-warning' : 'bg-danger'));

                activeProjsContainer.innerHTML += `
                    <div class="dashboard-project-card" onclick="openProjectDetail('${proj.id}')" title="프로젝트 상세 페이지로 이동">
                        <div class="dashboard-project-card-header">
                            <h4 class="dashboard-project-card-title">${proj.title}</h4>
                            <span class="badge ${ddayColor}" style="font-size: 0.7rem;">${ddayText}</span>
                        </div>
                        <div class="project-progress" style="margin: 0;">
                            <div class="progress-container" style="height: 6px;">
                                <div class="progress-bar" style="width: ${percent}%;"></div>
                            </div>
                            <div class="project-progress-info" style="font-size: 0.775rem; margin-top: 0.35rem;">
                                <span>${completed} / ${total} 작업 완료</span>
                                <span style="font-weight: 600; color: var(--accent-color);">${percent}%</span>
                            </div>
                        </div>
                        <div class="dashboard-project-card-footer">
                            <span><i class="far fa-calendar"></i> 목표: ${formatFriendlyDate(proj.due_date)}</span>
                            <span style="color: var(--accent-color); font-weight: 500;">상세보기 <i class="fas fa-arrow-right" style="font-size: 0.7rem;"></i></span>
                        </div>
                    </div>`;
            });
        }
    }

    // 5. 지연된 작업 렌더링
    const overdueContainer = document.getElementById('dashboard-overdue-tasks');
    if (overdueContainer) {
        overdueContainer.innerHTML = '';
        const displayOverdue = overdueTasks.slice(0, 5);
        if (displayOverdue.length === 0) {
            overdueContainer.innerHTML = `
                <div class="dashboard-empty" style="color: var(--success-color);">
                    <i class="fas fa-circle-check" style="color: var(--success-color); opacity: 0.85;"></i>
                    <p style="color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">지연된 작업이 없습니다!</p>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">모든 작업이 일정에 맞춰 잘 진행되고 있습니다 🎉</span>
                </div>`;
        } else {
            displayOverdue.forEach(({ task, diff }) => {
                const proj = task.project_id ? currentProjects.find(p => p.id === task.project_id) : null;
                const projName = proj ? proj.title : (task.project_id ? '삭제된 프로젝트' : '독립 작업');
                const prioColor = task.priority === 'High' ? 'danger-color' : (task.priority === 'Medium' ? 'warning-color' : 'info-color');
                const prioKor = task.priority === 'High' ? '높음' : (task.priority === 'Medium' ? '보통' : '낮음');

                overdueContainer.innerHTML += `
                    <div class="dashboard-list-item" onclick="openTaskDetail('${task.id}')" title="작업 상세 보기">
                        <div class="dashboard-list-item-main">
                            <h4 class="dashboard-list-item-title">${task.title}</h4>
                            <div class="dashboard-list-item-meta">
                                <span><i class="fas fa-folder" style="font-size: 0.7rem; color: var(--accent-color);"></i> ${projName}</span>
                                <span style="color: var(--${prioColor}); border: 1px solid var(--${prioColor}); border-radius: 3px; padding: 0.05rem 0.35rem; font-size: 0.7rem; font-weight: 600;">${prioKor}</span>
                            </div>
                        </div>
                        <div class="dashboard-list-item-badge">
                            <span class="badge bg-danger" style="font-size: 0.75rem; font-weight: 600;">
                                <i class="fas fa-triangle-exclamation"></i> D+${Math.abs(diff)} 지연
                            </span>
                        </div>
                    </div>`;
            });
        }
    }

    // 6. 마감 임박 작업 렌더링
    const urgentContainer = document.getElementById('dashboard-urgent-tasks');
    if (urgentContainer) {
        urgentContainer.innerHTML = '';
        const displayUrgent = urgentTasks.slice(0, 5);
        if (displayUrgent.length === 0) {
            urgentContainer.innerHTML = `
                <div class="dashboard-empty">
                    <i class="fas fa-calendar-check"></i>
                    <p style="font-weight: 500; margin-bottom: 0.25rem;">다가오는 마감 작업이 없습니다.</p>
                    <span style="font-size: 0.8rem; opacity: 0.7;">3일 이내에 마감 예정인 작업이 없습니다.</span>
                </div>`;
        } else {
            displayUrgent.forEach(({ task, diff }) => {
                const proj = task.project_id ? currentProjects.find(p => p.id === task.project_id) : null;
                const projName = proj ? proj.title : (task.project_id ? '삭제된 프로젝트' : '독립 작업');
                const prioColor = task.priority === 'High' ? 'danger-color' : (task.priority === 'Medium' ? 'warning-color' : 'info-color');
                const prioKor = task.priority === 'High' ? '높음' : (task.priority === 'Medium' ? '보통' : '낮음');
                const dtext = diff === 0 ? '오늘 마감' : `D-${diff}`;

                urgentContainer.innerHTML += `
                    <div class="dashboard-list-item" onclick="openTaskDetail('${task.id}')" title="작업 상세 보기">
                        <div class="dashboard-list-item-main">
                            <h4 class="dashboard-list-item-title">${task.title}</h4>
                            <div class="dashboard-list-item-meta">
                                <span><i class="fas fa-folder" style="font-size: 0.7rem; color: var(--accent-color);"></i> ${projName}</span>
                                <span style="color: var(--${prioColor}); border: 1px solid var(--${prioColor}); border-radius: 3px; padding: 0.05rem 0.35rem; font-size: 0.7rem; font-weight: 600;">${prioKor}</span>
                            </div>
                        </div>
                        <div class="dashboard-list-item-badge">
                            <span class="badge bg-warning" style="font-size: 0.75rem; font-weight: 600;">
                                <i class="far fa-clock"></i> ${dtext}
                            </span>
                        </div>
                    </div>`;
            });
        }
    }

    // 7. 최근 작업 렌더링
    const recentContainer = document.getElementById('dashboard-recent-tasks');
    if (recentContainer) {
        recentContainer.innerHTML = '';
        if (currentTasks.length === 0) {
            recentContainer.innerHTML = `
                <div class="dashboard-empty">
                    <i class="fas fa-tasks"></i>
                    <p style="font-weight: 500; margin-bottom: 0.25rem;">등록된 작업이 없습니다.</p>
                    <span style="font-size: 0.8rem; opacity: 0.7;">상단의 '+ 새 작업 추가' 버튼으로 첫 번째 작업을 등록해보세요!</span>
                </div>`;
        } else {
            const recentList = [...currentTasks].sort((a, b) => {
                if (a.created_at && b.created_at) {
                    const diff = new Date(b.created_at) - new Date(a.created_at);
                    if (!isNaN(diff) && diff !== 0) return diff;
                }
                return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
            }).slice(0, 5);

            recentList.forEach(task => {
                const proj = task.project_id ? currentProjects.find(p => p.id === task.project_id) : null;
                const projName = proj ? proj.title : (task.project_id ? '삭제된 프로젝트' : '독립 작업');
                const prioColor = task.priority === 'High' ? 'danger-color' : (task.priority === 'Medium' ? 'warning-color' : 'info-color');
                const prioKor = task.priority === 'High' ? '높음' : (task.priority === 'Medium' ? '보통' : '낮음');
                const statusColor = task.status === 'Done' ? 'bg-success' : (task.status === 'In Progress' ? 'bg-warning' : 'bg-default');
                const statusKor = task.status === 'Done' ? '완료됨' : (task.status === 'In Progress' ? '진행 중' : '해야 할 일');

                recentContainer.innerHTML += `
                    <div class="dashboard-list-item" onclick="openTaskDetail('${task.id}')" title="작업 상세 보기">
                        <div class="dashboard-list-item-main">
                            <h4 class="dashboard-list-item-title" style="${task.status === 'Done' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${task.title}</h4>
                            <div class="dashboard-list-item-meta">
                                <span><i class="fas fa-folder" style="font-size: 0.7rem; color: var(--accent-color);"></i> ${projName}</span>
                                <span style="color: var(--${prioColor}); border: 1px solid var(--${prioColor}); border-radius: 3px; padding: 0.05rem 0.35rem; font-size: 0.7rem; font-weight: 600;">${prioKor}</span>
                                <span><i class="far fa-calendar"></i> ${formatFriendlyDate(task.due_date)}</span>
                            </div>
                        </div>
                        <div class="dashboard-list-item-badge">
                            <span class="badge ${statusColor}" style="font-size: 0.725rem;">${statusKor}</span>
                        </div>
                    </div>`;
            });
        }
    }
}

function renderAnalytics() {
    const pContent = document.getElementById('analytics-projects-content');
    if (currentProjects.length === 0) { pContent.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 0;">데이터가 부족합니다.</p>'; }
    else {
        const pCounts = { '계획 됨': 0, '진행 중': 0, '완료됨': 0 };
        currentProjects.forEach(p => { if(pCounts[p.status] !== undefined) pCounts[p.status]++; });
        const total = currentProjects.length;
        
        pContent.innerHTML = '';
        [ {l:'계획 됨', k:'계획 됨', c:'var(--warning-color)'}, {l:'진행 중', k:'진행 중', c:'var(--info-color)'}, {l:'완료됨', k:'완료됨', c:'var(--success-color)'} ].forEach(item => {
            const pct = Math.round((pCounts[item.k] / total) * 100) || 0;
            pContent.innerHTML += `
                <div class="stat-bar-row">
                    <div class="stat-bar-info"><span>${item.l}</span><span>${pCounts[item.k]}개 (${pct}%)</span></div>
                    <div class="progress-container"><div class="progress-bar" style="width: ${pct}%; background-color: ${item.c};"></div></div>
                </div>`;
        });
    }

    const tContent = document.getElementById('analytics-tasks-content');
    if (currentTasks.length === 0) { tContent.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 0;">데이터가 부족합니다.</p>'; }
    else {
        const tCounts = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
        currentTasks.forEach(t => { if(tCounts[t.status] !== undefined) tCounts[t.status]++; });
        const total = currentTasks.length;
        
        tContent.innerHTML = '';
        [ {l:'해야 할 일 (To Do)', k:'To Do', c:'var(--text-muted)'}, {l:'진행 중 (In Progress)', k:'In Progress', c:'var(--warning-color)'}, {l:'완료됨 (Done)', k:'Done', c:'var(--success-color)'} ].forEach(item => {
            const pct = Math.round((tCounts[item.k] / total) * 100) || 0;
            tContent.innerHTML += `
                <div class="stat-bar-row">
                    <div class="stat-bar-info"><span>${item.l}</span><span>${tCounts[item.k]}개 (${pct}%)</span></div>
                    <div class="progress-container"><div class="progress-bar" style="width: ${pct}%; background-color: ${item.c};"></div></div>
                </div>`;
        });
    }
}