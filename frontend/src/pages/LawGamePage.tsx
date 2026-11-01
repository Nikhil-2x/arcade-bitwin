import { Navigate, useParams } from 'react-router'
import { LAW_CASES } from '../features/lawGame/data/cases.ts'
import LawGame from '../features/lawGame/LawGame.tsx'
import { LAW_PATHS } from '../features/lawGame/paths.ts'

export default function LawGamePage() {
  const level = Number(useParams().level)
  if (!LAW_CASES.some((c) => c.level === level)) return <Navigate to={LAW_PATHS.law} replace />
  return (
    <>
      <title>Crime Scene: Know the Law</title>
      <LawGame key={level} level={level} />
    </>
  )
}
