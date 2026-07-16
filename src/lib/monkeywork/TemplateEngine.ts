/**
 * Monkeywork Engine — Frontend TypeScript wrapper
 * Calls Tauri IPC commands for the Rust-based Scene Graph engine.
 */

import { invoke } from '@tauri-apps/api/core'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface RenderResult {
  html: string
  css: string
}

export interface ComponentInfo {
  name: string
  slots: string[]
  properties: string[]
  allowedChildren: string[]
}

export interface RegistryResult {
  components: Record<string, ComponentInfo>
}

/**
 * Validate a Scene Graph JSON string
 */
export async function validateScene(sceneJson: string): Promise<ValidationResult> {
  return invoke<ValidationResult>('validate_scene', { sceneJson })
}

/**
 * Render a Scene Graph to CSS string
 */
export async function renderCSS(sceneJson: string): Promise<string> {
  return invoke<string>('render_css', { sceneJson })
}

/**
 * Render a Scene Graph to full HTML + CSS
 */
export async function renderScene(sceneJson: string): Promise<RenderResult> {
  return invoke<RenderResult>('render_scene', { sceneJson })
}

/**
 * Get the component registry with all 12 component definitions
 */
export async function getComponentRegistry(): Promise<RegistryResult> {
  return invoke<RegistryResult>('get_component_registry')
}
