import { defineStore } from 'pinia'
import { createNode, createEdge, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import replicateService from '@/services/replicate'

export const useFlowStore = defineStore('flow', {
  state: () => ({
    nodes: [],
    edges: [],
    isLoading: false,
    error: null
  }),

  getters: {
    getNodeById: (state) => (nodeId) => {
      return state.nodes.find(node => node.id === nodeId)
    },

    getNodeConnections: (state) => (nodeId) => {
      return {
        incoming: state.edges.filter(edge => edge.target === nodeId),
        outgoing: state.edges.filter(edge => edge.source === nodeId)
      }
    }
  },

  actions: {
    addNode(node) {
      this.nodes.push(node)
    },

    updateNodeData(nodeId, data) {
      const nodeIndex = this.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        // Replace the entire node object to trigger reactivity
        this.nodes[nodeIndex] = {
          ...this.nodes[nodeIndex],
          data: { ...this.nodes[nodeIndex].data, ...data }
        }
      }
    },

    removeNode(nodeId) {
      this.nodes = this.nodes.filter(node => node.id !== nodeId)
      this.edges = this.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      )
    },

    addEdge(edge) {
      this.edges.push(edge)
    },

    removeEdge(edgeId) {
      this.edges = this.edges.filter(edge => edge.id !== edgeId)
    },

    setLoading(isLoading) {
      this.isLoading = isLoading
    },

    setError(error) {
      this.error = error
    },

    clearError() {
      this.error = null
    },

    updateNodePosition(nodeId, position) {
      const nodeIndex = this.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        // Replace the entire node object to trigger reactivity
        this.nodes[nodeIndex] = {
          ...this.nodes[nodeIndex],
          position
        }
      }
    }
  }
})
