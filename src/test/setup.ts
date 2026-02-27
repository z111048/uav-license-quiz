/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'

// jsdom does not implement scrollIntoView or scrollTo; stub to avoid test errors
Element.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}
