import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../ui/layout/header/header';
import { getUser, logout } from '../../../utils/auth';
import TableRow from '../../ui/layout/tableRow/tableRow';
import styles from './studentDiscipline.module.scss';

export const StudentDiscipline = () => {
  const navigate = useNavigate();
  const { disciplineId } = useParams<{ disciplineId: string }>();
  const user = getUser();
  const [disciplineName, setDisciplineName] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/student');
  };

  useEffect(() => {
    const fetchDiscipline = async () => {
      try {
        const response = await fetch(`/api/disciplines/${disciplineId}`);
        if (response.ok) {
          const data = await response.json();
          setDisciplineName(data.name);
        } else {
          setDisciplineName('Дисциплина не найдена');
        }
      } catch {
        setDisciplineName('Ошибка загрузки');
      }
    };

    if (disciplineId) {
      fetchDiscipline();
    }
  }, [disciplineId]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!disciplineId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Получаем ВСЕ записи
        const response = await fetch(`/api/attendance`);
        if (response.ok) {
          const allData = await response.json();
          
          // Фильтруем по студенту и дисциплине
          const filteredData = allData.filter((item: any) => {
            return Number(item.studentId) === Number(user.id) && 
                   Number(item.disciplineId) === Number(disciplineId);
          });
          
          // Сортируем по дате (от старых к новым)
          const sortedData = filteredData.sort((a: any, b: any) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          const records = sortedData.map((item: any) => ({
            id: item.id,
            date: new Date(item.date).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }),
            status: item.status || '-',
            reason: item.reason && item.reason !== '' ? item.reason : '-',
          }));
          setAttendanceRecords(records);
        }
      } catch (error) {
        console.error('Ошибка загрузки посещаемости:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [disciplineId, user]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Header userName={user?.fullName || 'Студент'} onLogout={handleLogout} />
        <div className={styles.pageContent}>
          <div className={styles.content}>
            <div className={styles.backBlock}>
              <button className={styles.backButton} onClick={handleBack}>
                <span className={styles.backArrow}>←</span>
                Назад к дисциплинам
              </button>
            </div>
            <div className={styles.titleBlock}>
              <h2 className={styles.title}>Ведомость по дисциплине: {disciplineName || 'Загрузка...'}</h2>
            </div>
          </div>
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <span className={styles.headerCell}>Дата</span>
              <span className={styles.headerCell}>Отметка</span>
              <span className={styles.headerCell}>Причина отсутствия</span>
            </div>
            <div className={styles.tableBodyWrapper}>
              <p className={styles.loading}>Загрузка данных...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header userName={user?.fullName || 'Студент'} onLogout={handleLogout} />

      <div className={styles.pageContent}>
        <div className={styles.content}>
          <div className={styles.backBlock}>
            <button className={styles.backButton} onClick={handleBack}>
              <span className={styles.backArrow}>←</span>
              Назад к дисциплинам
            </button>
          </div>

          <div className={styles.titleBlock}>
            <h2 className={styles.title}>
              Ведомость по дисциплине: {disciplineName || 'Загрузка...'}
            </h2>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <span className={styles.headerCell}>Дата</span>
            <span className={styles.headerCell}>Отметка</span>
            <span className={styles.headerCell}>Причина отсутствия</span>
          </div>

          <div className={styles.tableBodyWrapper}>
            {attendanceRecords.length === 0 ? (
              <p className={styles.noData}>Нет записей о посещаемости</p>
            ) : (
              attendanceRecords.map((record) => (
                <TableRow
                  key={record.id}
                  date={record.date}
                  status={record.status}
                  reason={record.reason}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDiscipline;