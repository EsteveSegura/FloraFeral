/**
 * Workflow Events
 * Simple event bus for workflow execution communication between
 * the executor and individual node components
 */

/**
 * Event types for workflow execution
 */
export const WORKFLOW_EVENTS = {
  // Workflow lifecycle
  WORKFLOW_START: 'workflow:start',
  WORKFLOW_COMPLETE: 'workflow:complete',
  WORKFLOW_ERROR: 'workflow:error',
  WORKFLOW_STOPPED: 'workflow:stopped',

  // Node execution
  NODE_EXECUTE: 'workflow:node:execute', // Request node to execute
  NODE_START: 'workflow:node:start',     // Node started executing
  NODE_COMPLETE: 'workflow:node:complete', // Node completed
  NODE_ERROR: 'workflow:node:error',     // Node encountered error
  NODE_SKIP: 'workflow:node:skip'        // Node was skipped
}

/**
 * Simple Event Emitter for workflow events
 */
class WorkflowEventBus {
  constructor() {
    this.listeners = new Map()
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name or pattern (e.g., 'workflow:node:execute:nodeId')
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  /**
   * Subscribe to an event (one-time)
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    return this.on(event, wrapper)
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} payload - Event data
   */
  emit(event, payload) {
    // Call exact match listeners
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(payload)
        } catch (error) {
          console.error(`[WorkflowEventBus] Error in listener for "${event}":`, error)
        }
      }
    }

    // Also call wildcard listeners if they exist
    const wildcardEvent = event.split(':').slice(0, -1).join(':') + ':*'
    const wildcardCallbacks = this.listeners.get(wildcardEvent)
    if (wildcardCallbacks) {
      for (const callback of wildcardCallbacks) {
        try {
          callback({ event, ...payload })
        } catch (error) {
          console.error(`[WorkflowEventBus] Error in wildcard listener for "${wildcardEvent}":`, error)
        }
      }
    }
  }

  /**
   * Emit a node-specific event
   * @param {string} baseEvent - Base event type from WORKFLOW_EVENTS
   * @param {string} nodeId - Node ID
   * @param {*} payload - Event data
   */
  emitNodeEvent(baseEvent, nodeId, payload = {}) {
    const specificEvent = `${baseEvent}:${nodeId}`
    this.emit(specificEvent, { nodeId, ...payload })
    this.emit(baseEvent, { nodeId, ...payload })
  }

  /**
   * Subscribe to a node-specific event
   * @param {string} baseEvent - Base event type from WORKFLOW_EVENTS
   * @param {string} nodeId - Node ID
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onNode(baseEvent, nodeId, callback) {
    const specificEvent = `${baseEvent}:${nodeId}`
    return this.on(specificEvent, callback)
  }

  /**
   * Request a node to execute and return a promise that resolves when complete
   * @param {string} nodeId - Node ID to execute
   * @param {number} timeout - Timeout in milliseconds (default: 5 minutes)
   * @returns {Promise<Object>} - Resolves with result or rejects with error
   */
  requestNodeExecution(nodeId, timeout = 300000) {
    return new Promise((resolve, reject) => {
      let completed = false
      let unsubComplete = null
      let unsubError = null
      let timeoutId = null

      const cleanup = () => {
        completed = true
        if (unsubComplete) unsubComplete()
        if (unsubError) unsubError()
        if (timeoutId) clearTimeout(timeoutId)
      }

      // Listen for completion
      unsubComplete = this.onNode(WORKFLOW_EVENTS.NODE_COMPLETE, nodeId, (payload) => {
        if (!completed) {
          cleanup()
          resolve(payload)
        }
      })

      // Listen for error
      unsubError = this.onNode(WORKFLOW_EVENTS.NODE_ERROR, nodeId, (payload) => {
        if (!completed) {
          cleanup()
          reject(new Error(payload.error || 'Node execution failed'))
        }
      })

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!completed) {
          cleanup()
          reject(new Error(`Node ${nodeId} execution timed out after ${timeout}ms`))
        }
      }, timeout)

      // Emit execute request
      this.emitNodeEvent(WORKFLOW_EVENTS.NODE_EXECUTE, nodeId)
    })
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear()
  }

  /**
   * Get count of listeners for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    const callbacks = this.listeners.get(event)
    return callbacks ? callbacks.size : 0
  }
}

// Export singleton instance
const workflowEventBus = new WorkflowEventBus()
export default workflowEventBus

// Also export the class for testing
export { WorkflowEventBus }
