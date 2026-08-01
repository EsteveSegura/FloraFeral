import { computed, ref } from 'vue'

/**
 * Side panel invocation, shared across the whole app.
 *
 * The state lives at module level on purpose: the panel is rendered by
 * FlowCanvasView, but what opens it is a button inside a node, several
 * components deep into VueFlow. Same trick the workflow event bus uses to let
 * nodes talk to the canvas without prop drilling.
 *
 * Only one panel is open at a time; opening another one replaces it.
 */

/**
 * Panels the canvas knows how to render. FlowCanvasView switches on these
 */
export const PANEL_TYPES = {
  NODE_OPTIONS: 'node-options'
}

// { type: string, ...props } | null
const activePanel = ref(null)

export function useSidePanel() {
  const isPanelOpen = computed(() => activePanel.value !== null)

  /**
   * @param {string} type - Panel to render, e.g. 'node-options'
   * @param {Object} [props] - Payload the panel needs, e.g. { nodeId }
   */
  function openPanel(type, props = {}) {
    activePanel.value = { type, ...props }
  }

  function closePanel() {
    activePanel.value = null
  }

  /**
   * Close only if the given panel type is the one on screen. Lets a panel shut
   * itself down without stepping on whatever replaced it in the meantime
   */
  function closePanelOfType(type) {
    if (activePanel.value?.type === type) {
      activePanel.value = null
    }
  }

  return {
    activePanel,
    isPanelOpen,
    openPanel,
    closePanel,
    closePanelOfType
  }
}
