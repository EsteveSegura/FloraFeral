/**
 * Composable for Connection Drop on empty canvas
 * When a connection is dragged from a handle and released over the empty pane,
 * opens the nodes menu filtered to the types that can actually connect to that port,
 * and creates the chosen node already wired to the origin handle
 */

import { computed, nextTick, ref } from 'vue'
import {
  getHandlePortType,
  getCompatibleConnectionOptions,
  validateConnection
} from '@/lib/connection'
import { PORT_TYPES } from '@/lib/node-shapes'
import { resolveRerouteType } from '@/lib/upstream'

// Rough node size used to place the new node around the drop point
const NODE_WIDTH = 220
const NODE_HALF_HEIGHT = 50

export function useConnectionDrop(
  flowStore,
  createNodeAtPosition,
  screenToFlowCoordinate,
  { addEdges },
  openNodesMenuAt,
  closeMenu
) {
  const pendingConnection = ref(null)

  // Origin of the connection currently being dragged
  let connectionOrigin = null
  // VueFlow emits `connect` before `connectEnd`, so this flag tells
  // "dropped in the void" apart from "dropped on a valid handle"
  let connectionMade = false
  // Timestamp of the drop, to recognise the click fired by that very same gesture
  let dropTimeStamp = -Infinity

  /**
   * Node types (and specific handles) the pending connection can be wired to
   */
  const connectionOptions = computed(() => {
    if (!pendingConnection.value) return []

    return getCompatibleConnectionOptions(
      pendingConnection.value.portType,
      pendingConnection.value.handleType
    )
  })

  /**
   * Handle the start of a connection drag
   * @param {Object} params - VueFlow payload { event, nodeId, handleId, handleType }
   */
  function handleConnectStart({ nodeId, handleId, handleType }) {
    connectionMade = false
    connectionOrigin = { nodeId, handleId, handleType }
  }

  /**
   * Flag that a real connection was created, so the menu is not opened
   */
  function markConnectionMade() {
    connectionMade = true
  }

  /**
   * Handle the end of a connection drag
   * @param {MouseEvent|TouchEvent|undefined} event - Pointer event that ended the drag
   */
  function handleConnectEnd(event) {
    const origin = connectionOrigin
    connectionOrigin = null

    if (connectionMade || !origin || !event) return

    // Only react when dropped on the empty pane, never on top of a node
    if (!event.target?.classList?.contains('vue-flow__pane')) return

    const originNode = flowStore.nodes.find(n => n.id === origin.nodeId)
    if (!originNode) return

    let portType = getHandlePortType(originNode.type, origin.handleId, origin.handleType)

    // A reroute declares the wildcard, so the menu has to be filtered by what it
    // is actually carrying: otherwise every node would be offered, wired to its
    // port 0 regardless of type. An unconnected reroute has nothing to offer and
    // falls through the guard below, which is the right call
    if (portType === PORT_TYPES.ANY) {
      portType = resolveRerouteType(origin.nodeId, flowStore.nodes, flowStore.edges)
    }

    if (!portType) return

    const dropPosition = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })

    // Dragging from an output places the new node to the right of the drop point,
    // dragging from an input places it to the left
    const position = {
      x: origin.handleType === 'source' ? dropPosition.x : dropPosition.x - NODE_WIDTH,
      y: dropPosition.y - NODE_HALF_HEIGHT
    }

    pendingConnection.value = { ...origin, portType, position }
    dropTimeStamp = event.timeStamp

    // Defer opening until VueFlow has finished tearing down the connection line
    nextTick(() => openNodesMenuAt(event.clientX, event.clientY))
  }

  /**
   * Whether a click belongs to the same gesture that just dropped the connection
   * Releasing the drag fires mouseup and click back to back, and that click must
   * not be treated as "clicked outside the menu"
   * @param {MouseEvent} event - Click event
   * @returns {boolean}
   */
  function isDropGestureClick(event) {
    return event.timeStamp - dropTimeStamp < 100
  }

  /**
   * Create the chosen node at the drop position and connect it to the origin handle
   * @param {Object} option - Option from connectionOptions
   */
  async function createNodeFromConnection(option) {
    const pending = pendingConnection.value
    if (!pending || !option) return

    const newNode = createNodeAtPosition(option.nodeType, pending.position)
    if (!newNode) {
      cancelPendingConnection()
      return
    }

    // Wait for VueFlow to process the new node before adding the edge
    await nextTick()

    const draggedFromOutput = pending.handleType === 'source'
    const connection = {
      source: draggedFromOutput ? pending.nodeId : newNode.id,
      sourceHandle: draggedFromOutput ? pending.handleId : option.handleId,
      target: draggedFromOutput ? newNode.id : pending.nodeId,
      targetHandle: draggedFromOutput ? option.handleId : pending.handleId
    }

    const sourceNode = flowStore.nodes.find(n => n.id === connection.source)
    const targetNode = flowStore.nodes.find(n => n.id === connection.target)

    const validation = validateConnection(
      connection,
      sourceNode,
      targetNode,
      flowStore.edges,
      flowStore.nodes
    )

    if (validation.valid) {
      addEdges([connection])
      flowStore.clearError()
    } else {
      console.warn('Connection rejected:', validation.reason)
    }

    cancelPendingConnection()
    closeMenu()
  }

  /**
   * Drop the pending connection, leaving the menu in its regular mode
   */
  function cancelPendingConnection() {
    pendingConnection.value = null
    connectionOrigin = null
    connectionMade = false
    dropTimeStamp = -Infinity
  }

  return {
    pendingConnection,
    connectionOptions,
    handleConnectStart,
    handleConnectEnd,
    markConnectionMade,
    isDropGestureClick,
    createNodeFromConnection,
    cancelPendingConnection
  }
}
