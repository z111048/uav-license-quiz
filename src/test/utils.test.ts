import { describe, it, expect } from 'vitest'
import { shuffleArray, normalizeBankData } from '../utils'
import type { Question, BankData } from '../types'

const sampleQuestions: Question[] = [
  { id: 1, question: 'Q1', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', chapter: 'Ch1' },
  { id: 2, question: 'Q2', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'B', chapter: 'Ch1' },
  { id: 3, question: 'Q3', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'C', chapter: 'Ch2' },
]

describe('shuffleArray', () => {
  it('returns array with same elements', () => {
    const result = shuffleArray(sampleQuestions)
    expect(result).toHaveLength(sampleQuestions.length)
    expect(result).toEqual(expect.arrayContaining(sampleQuestions))
  })

  it('does not mutate the original array', () => {
    const original = [...sampleQuestions]
    shuffleArray(sampleQuestions)
    expect(sampleQuestions).toEqual(original)
  })

  it('returns a new array reference', () => {
    const result = shuffleArray(sampleQuestions)
    expect(result).not.toBe(sampleQuestions)
  })

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([])
  })

  it('handles single-element array', () => {
    expect(shuffleArray([42])).toEqual([42])
  })
})

describe('normalizeBankData', () => {
  it('returns bank data unchanged when already in object format', () => {
    const bankData: BankData = {
      questions: sampleQuestions,
      answer_option_whitelist: ['選項A'],
    }
    expect(normalizeBankData(bankData)).toBe(bankData)
  })

  it('wraps legacy array format with empty whitelist', () => {
    const result = normalizeBankData(sampleQuestions)
    expect(result.questions).toBe(sampleQuestions)
    expect(result.answer_option_whitelist).toEqual([])
  })

  it('preserves questions array reference from legacy format', () => {
    const result = normalizeBankData(sampleQuestions)
    expect(result.questions).toStrictEqual(sampleQuestions)
  })
})
