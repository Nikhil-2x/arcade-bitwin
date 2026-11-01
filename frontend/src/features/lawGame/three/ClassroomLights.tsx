export function ClassroomLights() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#fff4e0', '#5b5a66', 0.9]} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} />
      <pointLight position={[0, 2.5, -1]} intensity={4} distance={9} color="#ffe9c4" />
      <pointLight position={[0, 2.5, -4]} intensity={4} distance={9} color="#ffe9c4" />
    </>
  )
}
