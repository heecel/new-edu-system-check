import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Header from '../../ui/layout/header/header';
import { getUser, logout } from '../../../utils/auth';
import styles from './teacherGroups.module.scss';

interface Student {
  id: string;
  fullName: string;
  groupId: number;
}

interface AttendanceRow {
  studentId: string;
  fullName: string;
  mark: string;
  reason: string;
}

export const TeacherGroups = () => {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const user = getUser();
  const [groupName, setGroupName] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/teacher');
  };

  const handleStartPoll = () => {
    console.log('Провести опрос присутствия');
  };

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setSelectedPeriod(period);
  };

  const handleDownloadReport = () => {
    console.log('Скачать отчет Word');
  };

  const handleMarkChange = (studentId: string, value: string) => {
    setAttendanceRows(prev =>
      prev.map(row =>
        row.studentId === studentId 
          ? { ...row, mark: value, reason: (value === 'Н' || value === 'У') ? row.reason : '-' } 
          : row
      )
    );
  };

  const handleReasonChange = (studentId: string, value: string) => {
    setAttendanceRows(prev =>
      prev.map(row =>
        row.studentId === studentId ? { ...row, reason: value } : row
      )
    );
  };

  // ===== ЗАГРУЗКА ДАННЫХ (ГАРАНТИРОВАННО РАБОТАЕТ) =====
  const loadData = async () => {
    console.log('🔄 loadData вызван');

    if (!groupId) {
      console.log('❌ groupId отсутствует');
      return;
    }

    if (!selectedDisciplineId) {
      console.log('❌ selectedDisciplineId отсутствует');
      return;
    }

    if (!startDate) {
      console.log('❌ startDate отсутствует');
      return;
    }

    const dateStr = startDate.toISOString().split('T')[0];
    console.log(`📅 Дата: ${dateStr}, Дисциплина ID: ${selectedDisciplineId}`);

    try {
      // 1. Загружаем студентов
      const studentsRes = await fetch(`/api/students?groupId=${groupId}`);
      const studentsData: Student[] = await studentsRes.json();
      console.log(`👨‍🎓 Загружено студентов: ${studentsData.length}`);
      setStudents(studentsData);

      // 2. Загружаем ВСЮ ПОСЕЩАЕМОСТЬ
      const attendanceRes = await fetch('/api/attendance');
      const allAttendance = await attendanceRes.json();
      console.log(`📋 Всего записей в attendance: ${allAttendance.length}`);

      // 3. Фильтруем по дисциплине и дате
      const filtered = allAttendance.filter((item: any) => {
        return Number(item.disciplineId) === selectedDisciplineId && 
               item.date === dateStr;
      });
      console.log(`📊 Найдено записей для этой даты и дисциплины: ${filtered.length}`);

      // 4. Строим строки таблицы
      const rows = studentsData.map(student => {
        const found = filtered.find((item: any) => Number(item.studentId) === Number(student.id));
        return {
          studentId: student.id,
          fullName: student.fullName,
          mark: found ? found.status : '-',
          reason: found && found.reason && found.reason !== '' ? found.reason : '-'
        };
      });

      setAttendanceRows(rows);
      console.log('✅ Данные загружены успешно');
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    }
  };

  // ===== СОХРАНЕНИЕ =====
  const handleSave = async () => {
    if (!selectedDisciplineId) {
      setSaveMessage('⚠️ Выберите дисциплину');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (!startDate) {
      setSaveMessage('⚠️ Выберите дату');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setLoading(true);
    setSaveMessage('⏳ Сохранение...');

    const dateStr = startDate.toISOString().split('T')[0];

    const dataToSave = attendanceRows
      .filter(row => row.mark !== '-')
      .map(row => ({
        studentId: parseInt(row.studentId),
        disciplineId: selectedDisciplineId,
        date: dateStr,
        status: row.mark,
        reason: row.mark === 'Н' || row.mark === 'У' ? row.reason : ''
      }));

    console.log('💾 Сохраняемые данные:', dataToSave);

    try {
      // 1. Получаем ВСЕ записи
      const allRes = await fetch('/api/attendance');
      const allRecords = await allRes.json();

      // 2. Находим ID записей для удаления
      const idsToDelete = allRecords
        .filter((record: any) => {
          return Number(record.disciplineId) === selectedDisciplineId && 
                 record.date === dateStr;
        })
        .map((record: any) => record.id);

      console.log(`🗑️ Удаляем записи с ID:`, idsToDelete);

      // 3. Удаляем все старые записи
      if (idsToDelete.length > 0) {
        await Promise.all(
          idsToDelete.map((id: string) => 
            fetch(`/api/attendance/${id}`, { method: 'DELETE' })
          )
        );
      }

      // 4. Сохраняем новые записи
      for (const record of dataToSave) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
      }

      setSaveMessage(`✅ Сохранено ${dataToSave.length} записей!`);
      setTimeout(() => setSaveMessage(''), 3000);

      // 5. ПЕРЕЗАГРУЖАЕМ ДАННЫЕ
      await loadData();

    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      setSaveMessage('❌ Ошибка сохранения');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка группы
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (response.ok) {
          const data = await response.json();
          setGroupName(data.name);
          console.log(`🏫 Группа: ${data.name}`);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  // Загрузка данных ПРИ КАЖДОМ ИЗМЕНЕНИИ
  useEffect(() => {
    console.log('🔄 useEffect сработал');
    loadData();
  }, [groupId, selectedDisciplineId, startDate]);

  const CustomDateInput = ({ value, onClick, placeholder }: any) => (
    <div className={styles.dateInputWrapper}>
      <input
        className={styles.dateInput}
        value={value}
        placeholder={placeholder || 'дд.мм.гггг'}
        readOnly
        onClick={onClick}
      />
      <button className={styles.calendarButton} onClick={onClick} type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8690A2" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    </div>
  );

  const DisciplineSelect = ({ value, onChange, onSelectId }: { 
    value: string; 
    onChange: (val: string) => void;
    onSelectId: (id: number) => void;
  }) => {
    const [disciplines, setDisciplines] = useState<{ id: number; name: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
      const fetchDisciplines = async () => {
        try {
          const response = await fetch(`/api/disciplines?groupId=${groupId}`);
          if (response.ok) {
            const data = await response.json();
            setDisciplines(data);
            console.log(`📚 Загружено дисциплин: ${data.length}`);
            if (data.length > 0 && !value) {
              onChange(data[0].name);
              onSelectId(data[0].id);
            }
          }
        } catch (error) {
          console.error('Ошибка загрузки дисциплин:', error);
        }
      };
      fetchDisciplines();
    }, [groupId]);

    const handleSelect = (discipline: { id: number; name: string }) => {
      onChange(discipline.name);
      onSelectId(discipline.id);
      setIsOpen(false);
    };

    return (
      <div className={styles.selectWrapper}>
        <div className={styles.selectInputWrapper} onClick={() => setIsOpen(!isOpen)}>
          <span className={styles.selectValue}>{value || 'Выберите дисциплину'}</span>
          <button className={styles.selectArrowButton} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8690A2" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {isOpen && (
          <div className={styles.selectDropdown}>
            {disciplines.map((disc) => (
              <div
                key={disc.id}
                className={styles.selectOption}
                onClick={() => handleSelect(disc)}
              >
                {disc.name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerWrapper}>
        <Header userName={user?.fullName || 'Преподаватель'} onLogout={handleLogout} />
      </div>

      <div className={styles.pageContent}>
        <div className={styles.leftContent}>
          <div className={styles.backBlock}>
            <button className={styles.backButton} onClick={handleBack}>
              <span className={styles.backArrow}>←</span>
              Назад к группам
            </button>
          </div>

          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              Ведомость по группе: {groupName || 'Загрузка...'}
            </h2>
            
            <div className={styles.buttonsWrapper}>
              <button 
                className={styles.saveButton} 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className={styles.pollButton} onClick={handleStartPoll}>
                Провести опрос присутствия
              </button>
            </div>
          </div>
        </div>

        <div className={styles.centerContent}>
          <div className={styles.periodSelector}>
            <button
              className={`${styles.periodButton} ${selectedPeriod === 'daily' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('daily')}
            >
              Ежедневная
            </button>
            <button
              className={`${styles.periodButton} ${selectedPeriod === 'weekly' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('weekly')}
            >
              Еженедельная
            </button>
            <button
              className={`${styles.periodButton} ${selectedPeriod === 'monthly' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('monthly')}
            >
              Ежемесячная
            </button>
          </div>

          <div className={styles.dateBlock}>
            <div className={styles.dateItem}>
              <label className={styles.dateLabel}>Дата</label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                customInput={<CustomDateInput />}
                dateFormat="dd.MM.yyyy"
                popperPlacement="bottom-start"
              />
            </div>

            <div className={styles.dateItem}>
              <label className={styles.dateLabel}>Дисциплина</label>
              <DisciplineSelect 
                value={selectedDiscipline} 
                onChange={setSelectedDiscipline}
                onSelectId={setSelectedDisciplineId}
              />
            </div>

            <div className={styles.downloadItem}>
              <button className={styles.downloadButton} onClick={handleDownloadReport}>
                Скачать отчет Word
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className={styles.saveMessage}>{saveMessage}</div>
          )}
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <span className={styles.headerCell}>п/п</span>
            <span className={styles.headerCell}>ФИО</span>
            <span className={styles.headerCell}>Отметка</span>
            <span className={styles.headerCell}>Причина отсутствия</span>
          </div>
          <div className={styles.tableBody}>
            {attendanceRows.length === 0 ? (
              <p className={styles.noData}>Нет данных о студентах</p>
            ) : (
              attendanceRows.map((row, index) => {
                const isReasonDisabled = row.mark === '-' || row.mark === 'П';
                return (
                  <div key={row.studentId} className={styles.tableRow}>
                    <span className={styles.rowCell}>{index + 1}</span>
                    <span className={styles.rowCell}>{row.fullName}</span>
                    <div className={styles.rowCell}>
                      <select
                        className={styles.markSelect}
                        value={row.mark}
                        onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                      >
                        <option value="-">-</option>
                        <option value="П">П</option>
                        <option value="У">У</option>
                        <option value="Н">Н</option>
                      </select>
                    </div>
                    <div className={styles.rowCell}>
                      <input
                        type="text"
                        className={`${styles.reasonInput} ${isReasonDisabled ? styles.reasonDisabled : ''}`}
                        value={row.reason === '-' ? '' : row.reason}
                        onChange={(e) => handleReasonChange(row.studentId, e.target.value)}
                        placeholder={isReasonDisabled ? 'Отметка не выбрана' : 'Введите причину'}
                        disabled={isReasonDisabled}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherGroups;