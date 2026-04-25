import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface ExportData {
  title: string
  headers: string[]
  rows: (string | number)[][]
  filename: string
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text(data.title, 14, 22)

  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 91, 219],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  doc.save(`${data.filename}.pdf`)
}

export async function exportToExcel(data: ExportData) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(data.title)

  worksheet.columns = data.headers.map((header) => ({
    header,
    key: header.toLowerCase().replace(/\s+/g, '_'),
    width: 15,
  }))

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '3B5BDB' },
  }
  headerRow.alignment = { horizontal: 'center' }

  data.rows.forEach((row, index) => {
    const excelRow = worksheet.addRow(row)
    if (index % 2 === 0) {
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' },
      }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `${data.filename}.xlsx`)
}

export function exportGradesToPDF(studentName: string, grades: { subject: string; assignment: string; score: number; maxScore: number; date: string }[]) {
  const headers = ['Subject', 'Assignment', 'Score', 'Max Score', 'Percentage', 'Date']
  const rows = grades.map((g) => [
    g.subject,
    g.assignment,
    g.score.toString(),
    g.maxScore.toString(),
    `${((g.score / g.maxScore) * 100).toFixed(1)}%`,
    new Date(g.date).toLocaleDateString(),
  ])

  exportToPDF({
    title: `Grades Report - ${studentName}`,
    headers,
    rows,
    filename: `grades_${studentName.replace(/\s+/g, '_')}`,
  })
}

export function exportGradesToExcel(studentName: string, grades: { subject: string; assignment: string; score: number; maxScore: number; date: string }[]) {
  const headers = ['Subject', 'Assignment', 'Score', 'Max Score', 'Percentage', 'Date']
  const rows = grades.map((g) => [
    g.subject,
    g.assignment,
    g.score,
    g.maxScore,
    ((g.score / g.maxScore) * 100).toFixed(1) + '%',
    new Date(g.date).toLocaleDateString(),
  ])

  exportToExcel({
    title: `Grades Report - ${studentName}`,
    headers,
    rows,
    filename: `grades_${studentName.replace(/\s+/g, '_')}`,
  })
}

export function exportAttendanceToPDF(studentName: string, attendance: { date: string; status: string; room: string }[]) {
  const headers = ['Date', 'Room', 'Status']
  const rows = attendance.map((a) => [
    new Date(a.date).toLocaleDateString(),
    a.room,
    a.status.charAt(0).toUpperCase() + a.status.slice(1),
  ])

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const absentCount = attendance.filter((a) => a.status === 'absent').length
  const lateCount = attendance.filter((a) => a.status === 'late').length

  const summaryRows = [
    ['Summary', ''],
    ['Present', presentCount.toString()],
    ['Absent', absentCount.toString()],
    ['Late', lateCount.toString()],
    ['Total', attendance.length.toString()],
  ]

  const finalRows = [...rows, ...summaryRows]

  exportToPDF({
    title: `Attendance Report - ${studentName}`,
    headers,
    rows: finalRows,
    filename: `attendance_${studentName.replace(/\s+/g, '_')}`,
  })
}

export function exportAttendanceToExcel(studentName: string, attendance: { date: string; status: string; room: string }[]) {
  const headers = ['Date', 'Room', 'Status']
  const rows = attendance.map((a) => [
    new Date(a.date).toLocaleDateString(),
    a.room,
    a.status.charAt(0).toUpperCase() + a.status.slice(1),
  ])

  exportToExcel({
    title: `Attendance Report - ${studentName}`,
    headers,
    rows,
    filename: `attendance_${studentName.replace(/\s+/g, '_')}`,
  })
}

export function exportRoomReportToPDF(
  className: string,
  students: { name: string; averageScore: number; attendance: string }[]
) {
  const headers = ['Student Name', 'Average Score', 'Attendance']
  const rows = students.map((s) => [s.name, `${s.averageScore.toFixed(1)}%`, s.attendance])

  exportToPDF({
    title: `Room Report - ${className}`,
    headers,
    rows,
    filename: `room_report_${className.replace(/\s+/g, '_')}`,
  })
}

export function exportRoomReportToExcel(
  className: string,
  students: { name: string; averageScore: number; attendance: string }[]
) {
  const headers = ['Student Name', 'Average Score', 'Attendance']
  const rows = students.map((s) => [s.name, s.averageScore.toFixed(1), s.attendance])

  exportToExcel({
    title: `Room Report - ${className}`,
    headers,
    rows,
    filename: `room_report_${className.replace(/\s+/g, '_')}`,
  })
}
