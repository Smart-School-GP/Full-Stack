import { redirect } from 'next/navigation'

interface PageProps {
  params: {
    roomId: string
  }
}

export default function TeacherRoomDetailAliasPage({ params }: PageProps) {
  redirect(`/teacher/classes/${params.roomId}`)
}
