import { useRef, useState } from 'react'
import { PuzzleRuntime } from '@/runtime/types'
import { AssemblyAction } from './definition'
import { AssemblyState, getPieceOccupiedCells } from './state'
import { usePuzzleRuntime } from '@/runtime/usePuzzleRuntime'

interface AssemblyRendererProps {
  runtime: PuzzleRuntime<AssemblyState, AssemblyAction>
}

export default function AssemblyRenderer({ runtime }: AssemblyRendererProps) {
  const { state, status } = usePuzzleRuntime(runtime)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hintLevel, setHintLevel] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const CELL_SIZE = 40

  // Map client (page) coordinates into the puzzle svg's own local coordinate
  // space via its bounding rect, instead of using raw clientX/Y — those only
  // happen to line up with local coordinates if the svg sits at page origin.
  const toLocalCell = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX / CELL_SIZE, y: clientY / CELL_SIZE }
    const rect = svg.getBoundingClientRect()
    return { x: (clientX - rect.left) / CELL_SIZE, y: (clientY - rect.top) / CELL_SIZE }
  }

  const handleMouseDown = (e: React.MouseEvent, pieceId: string) => {
    setDragging(pieceId)
    const piece = state.pieces.find((p) => p.id === pieceId)
    if (piece) {
      const point = toLocalCell(e.clientX, e.clientY)
      setDragOffset({ x: point.x - piece.x, y: point.y - piece.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const point = toLocalCell(e.clientX, e.clientY)
      const newX = Math.round(point.x - dragOffset.x)
      const newY = Math.round(point.y - dragOffset.y)
      runtime.dispatch({ type: 'movePiece', pieceId: dragging, newX, newY })
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  const handleRotate = (pieceId: string) => {
    runtime.dispatch({ type: 'rotatePiece', pieceId })
  }

  const handleRequestHint = () => {
    const nextLevel = Math.min(hintLevel + 1, 3)
    setHintLevel(nextLevel)
    runtime.requestHint(nextLevel as any)
  }

  const hint = hintLevel > 0 ? (runtime.getHintState(hintLevel as any) as { hint: string; highlightPieceIds?: string[] }) : null

  const getPieceColor = (index: number): string => {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff']
    return colors[index % colors.length]
  }

  const getPieceColorName = (index: number): string => {
    const names = ['Red', 'Yellow', 'Green', 'Blue']
    return names[index % names.length]
  }

  return (
    <div
      className="w-full h-screen bg-gradient-to-br from-shape-primary to-shape-secondary p-8 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Shape Workshop
        </h1>
        <div className="flex gap-2">
          {hintLevel < 3 && (
            <button onClick={handleRequestHint} className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 font-bold">
              💡 Hint ({hintLevel}/3)
            </button>
          )}
          <button
            onClick={() => {
              runtime.dispatch({ type: 'reset' })
              setHintLevel(0)
            }}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 font-bold"
          >
            ↻ Reset
          </button>
        </div>
      </div>

      {hint && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded max-w-2xl mx-auto w-full">
          <p className="text-blue-800 font-semibold">{hint.hint}</p>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center gap-8">
        {/* Target silhouette */}
        <div className="bg-white rounded-lg p-4 shadow-lg">
          <p className="text-xs font-bold mb-2 text-center">Target Shape</p>
          <svg width={CELL_SIZE * 6} height={CELL_SIZE * 6} className="border-2 border-gray-300 bg-gray-50 rounded">
            {state.targetSilhouette.map((cell, i) => (
              <rect key={i} x={cell.x * CELL_SIZE} y={cell.y * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill="#ddd" stroke="#999" strokeWidth="1" />
            ))}
          </svg>
        </div>

        {/* Puzzle area */}
        <div className="bg-white rounded-lg p-4 shadow-lg">
          <p className="text-xs font-bold mb-2 text-center">Assemble Here</p>
          <svg
            ref={svgRef}
            width={CELL_SIZE * state.gridSize}
            height={CELL_SIZE * state.gridSize}
            className="border-2 border-gray-300 bg-gray-50 rounded"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <defs>
              <pattern id="grid" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
                <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="#eee" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={CELL_SIZE * state.gridSize} height={CELL_SIZE * state.gridSize} fill="url(#grid)" />

            {/* Pieces */}
            {state.pieces.map((piece, idx) => {
              const occupiedCells = getPieceOccupiedCells(piece)
              const isHighlighted = hint?.highlightPieceIds?.includes(piece.id)
              return (
                <g key={piece.id} onMouseDown={(e) => handleMouseDown(e, piece.id)} style={{ cursor: dragging === piece.id ? 'grabbing' : 'grab' }}>
                  {occupiedCells.map((cell, i) => (
                    <rect
                      key={i}
                      x={cell.x * CELL_SIZE}
                      y={cell.y * CELL_SIZE}
                      width={CELL_SIZE - 2}
                      height={CELL_SIZE - 2}
                      fill={getPieceColor(idx)}
                      stroke={isHighlighted ? '#4d96ff' : '#333'}
                      strokeWidth={isHighlighted ? 3 : 1}
                      rx="2"
                    />
                  ))}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        {state.pieces.map((piece, idx) => (
          <button
            key={piece.id}
            onClick={() => handleRotate(piece.id)}
            className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 font-bold text-sm"
          >
            Rotate {getPieceColorName(idx)}
          </button>
        ))}
      </div>

      {status === 'won' && (
        <div className="mt-4 p-4 bg-green-100 rounded-lg text-center">
          <p className="text-green-800 font-bold text-xl">🎉 Puzzle assembled!</p>
        </div>
      )}
    </div>
  )
}
