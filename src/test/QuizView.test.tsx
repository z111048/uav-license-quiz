import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import QuizView from '../components/QuizView'
import type { Question, QuizSettings } from '../types'

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: '無人機最低飛行高度限制為何？',
    options: { A: '100 公尺', B: '150 公尺', C: '200 公尺', D: '無限制' },
    answer: 'A',
    chapter: '第一章',
  },
  {
    id: 2,
    question: '操作證有效期限為幾年？',
    options: { A: '一年', B: '兩年', C: '三年', D: '五年' },
    answer: 'C',
    chapter: '第一章',
  },
]

const defaultSettings: QuizSettings = {
  chapters: ['第一章'],
  count: 2,
  instantFeedback: true,
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('QuizView', () => {
  it('renders the first question text', () => {
    render(
      <QuizView
        queue={sampleQuestions}
        settings={defaultSettings}
        onFinish={() => {}}
      />
    )
    expect(screen.getByText('無人機最低飛行高度限制為何？')).toBeInTheDocument()
  })

  it('renders all four options as buttons', () => {
    render(
      <QuizView
        queue={sampleQuestions}
        settings={defaultSettings}
        onFinish={() => {}}
      />
    )
    const buttons = screen.getAllByRole('button')
    // Four option buttons + hint toggle button
    const optionButtons = buttons.filter((b) => ['100 公尺', '150 公尺', '200 公尺', '無限制'].some((t) => b.textContent?.includes(t)))
    expect(optionButtons).toHaveLength(4)
  })

  it('shows next button after selecting an answer', () => {
    render(
      <QuizView
        queue={sampleQuestions}
        settings={defaultSettings}
        onFinish={() => {}}
      />
    )
    const optionButton = screen.getByText('100 公尺').closest('button')!
    fireEvent.click(optionButton)

    expect(screen.getByText('下一題')).toBeInTheDocument()
  })

  it('calls onFinish after all questions are answered', async () => {
    const onFinish = vi.fn()
    render(
      <QuizView
        queue={sampleQuestions}
        settings={defaultSettings}
        onFinish={onFinish}
      />
    )

    // Answer question 1
    fireEvent.click(screen.getByText('100 公尺').closest('button')!)
    // Advance past ghost-click lock
    await act(async () => { vi.advanceTimersByTime(400) })
    fireEvent.click(screen.getByText('下一題'))

    // Answer question 2
    fireEvent.click(screen.getByText('三年').closest('button')!)
    await act(async () => { vi.advanceTimersByTime(400) })
    fireEvent.click(screen.getByText('下一題'))

    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish.mock.calls[0][0]).toHaveLength(2)
  })

  it('records correct/incorrect answers', async () => {
    const onFinish = vi.fn()
    render(
      <QuizView
        queue={[sampleQuestions[0]]}
        settings={defaultSettings}
        onFinish={onFinish}
      />
    )

    // Select wrong answer
    fireEvent.click(screen.getByText('150 公尺').closest('button')!)
    await act(async () => { vi.advanceTimersByTime(400) })
    fireEvent.click(screen.getByText('下一題'))

    const records = onFinish.mock.calls[0][0]
    expect(records[0].isCorrect).toBe(false)
    expect(records[0].userAnswer).toBe('B')
    expect(records[0].correctAnswer).toBe('A')
  })

  it('displays timer countdown', () => {
    render(
      <QuizView
        queue={sampleQuestions}
        settings={defaultSettings}
        onFinish={() => {}}
      />
    )
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
