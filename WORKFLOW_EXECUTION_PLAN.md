# Workflow Execution Feature - Implementation Plan

## Objetivo
Implementar una funcionalidad de "Play Workflow" similar a ComfyUI que ejecute todos los nodos del flujo en el orden correcto basado en sus dependencias.

## Arquitectura Recomendada: Modelo Híbrido Pull-Push

### Por qué este enfoque?
- **Respeta la arquitectura actual**: No requiere refactorizar el flujo de datos reactivo existente
- **Mejora progresiva**: Añade orquestación sin romper la ejecución manual
- **Separación clara**: El motor de ejecución es una preocupación separada del flujo de datos
- **Testeable**: Algoritmos de grafos y lógica de ejecución están aislados

---

## Componentes Principales

### 1. Graph Utilities (`/src/lib/graph-utils.js`)
Utilidades para análisis de dependencias y ordenamiento topológico.

**Funciones principales:**
- `topologicalSort(nodes, edges)` - Ordena nodos por dependencias usando algoritmo de Kahn
- `detectCycles(nodes, edges)` - Detecta ciclos con información del camino
- `findExecutableNodes(nodes, edges, executedNodes)` - Encuentra nodos listos para ejecutar
- `getNodeDependencies(nodeId, edges)` - Retorna IDs de nodos upstream
- `buildDependencyGraph(nodes, edges)` - Construye lista de adyacencia

### 2. Workflow Executor Service (`/src/services/workflow-executor.js`)
Motor de ejecución que orquesta la ejecución de nodos.

**API principal:**
```javascript
class WorkflowExecutor {
  async executeWorkflow(options)
  async executeNode(nodeId)
  pauseExecution()
  resumeExecution()
  stopExecution()
  getExecutionState()
  on(event, callback)  // 'node-start', 'node-complete', 'node-error', 'workflow-complete'
}
```

**Algoritmo de ejecución:**
1. Construir grafo de dependencias desde flowStore
2. Ejecutar ordenamiento topológico (o detectar ciclos)
3. Si hay ciclos, mostrar error con el camino
4. Crear cola de ejecución con niveles de dependencia
5. Por cada nivel (nodos sin dependencias pendientes):
   - Filtrar nodos que necesitan ejecución
   - Ejecutar nodos en paralelo (hasta maxParallelism)
   - Esperar a que todos los nodos del nivel completen
   - Actualizar estado de ejecución
   - Verificar señales de pausa/detención
6. Recopilar resultados y emitir evento de completado

**Características clave:**
- Ejecución paralela de nodos independientes (configurable)
- Manejo de errores con continuación
- Pausa/reanudación manteniendo estado
- Skip inteligente (solo ejecuta nodos que lo necesitan)
- Sistema de eventos para actualizaciones de UI

### 3. Execution State Store (`/src/stores/workflow-execution.js`)
Store Pinia para manejo de estado de ejecución.

**Estado:**
```javascript
{
  isExecuting: false,
  isPaused: false,
  executionId: null,
  nodeStates: Map<nodeId, ExecutionStatus>,
  nodeErrors: Map<nodeId, Error>,
  progress: {
    total: number,
    completed: number,
    executing: number,
    pending: number,
    error: number,
    skipped: number
  },
  executionQueue: [],
  startTime: null,
  endTime: null
}
```

**ExecutionStatus:** `'pending' | 'executing' | 'completed' | 'error' | 'skipped'`

### 4. Workflow Events (`/src/lib/workflow-events.js`)
Event bus simple para triggering de ejecución de nodos.

**Eventos:**
- `workflow:execute:${nodeId}` - Solicita ejecución de un nodo específico
- `workflow:start` - Workflow inicia
- `workflow:complete` - Workflow completa
- `workflow:error` - Error en workflow

### 5. Workflow Execution Composable (`/src/composables/useWorkflowExecution.js`)
Composable Vue que envuelve el executor para componentes.

**API:**
```javascript
const {
  executeWorkflow,
  pauseExecution,
  stopExecution,
  isExecuting,
  isPaused,
  progress,
  nodeStates
} = useWorkflowExecution()
```

### 6. Node Execution Hook (`/src/composables/useWorkflowEvents.js`)
Hook para que nodos escuchen solicitudes de ejecución.

**Uso en nodos:**
```javascript
import { useWorkflowEvents } from '@/composables/useWorkflowEvents'

const { onExecutionRequested } = useWorkflowEvents(props.id)

onExecutionRequested(async () => {
  await handleGenerate()
})
```

---

## Componentes de UI

### 1. WorkflowControls.vue (`/src/components/workflow/WorkflowControls.vue`)
Panel de controles de workflow.

**Elementos:**
- Botón Play (acción primaria)
- Botones Pause/Stop (durante ejecución)
- Indicador de progreso (X/Y nodos completados)
- Barra de progreso visual
- Selector de modo de ejecución (opcional)

**Diseño visual:**
```
┌─────────────────────────┐
│ ▶️ Play Workflow        │  ← Botón verde cuando listo
│ ⏸️ Pause | ⏹️ Stop       │  ← Durante ejecución
│ Progress: 3/8 nodes     │  ← Texto de progreso
│ [=========>    ] 37%    │  ← Barra de progreso
└─────────────────────────┘
```

### 2. Modificaciones a BaseNode.vue
Añadir indicadores de estado de ejecución.

**Indicadores visuales:**
- Badge con emoji según estado:
  - ⏳ Pending
  - ⚡ Executing (con animación de pulso)
  - ✅ Completed (con brillo verde)
  - ❌ Error (con borde rojo)
  - ⏭️ Skipped (con opacidad reducida)
- Número de orden de ejecución (opcional)

### 3. Integración en FloatingMenu.vue
Añadir botón de workflow al menú flotante que abre el panel de controles.

---

## Lógica de Ejecución de Nodos

### Determinar si un nodo necesita ejecución
```javascript
function shouldExecuteNode(node, nodeDef) {
  // Nodos terminales no se ejecutan
  if (!nodeDef.outputs || nodeDef.outputs.length === 0) {
    return false
  }

  // Por tipo de nodo
  switch (node.type) {
    case NODE_TYPES.IMAGE_GENERATOR:
      return !node.data.lastOutputSrc // No tiene imagen generada

    case NODE_TYPES.TEXT_GENERATOR:
      return !node.data.generatedText // No tiene texto generado

    case NODE_TYPES.PROMPT:
      return !node.data.prompt || node.data.prompt.trim() === ''

    case NODE_TYPES.DRAW:
      return !node.data.outputSrc // No tiene output de dibujo

    case NODE_TYPES.IMAGE:
      return !node.data.src // No tiene imagen cargada

    default:
      return true // Por defecto necesita ejecución
  }
}
```

---

## Manejo de Errores

### Estrategia multinivel:

**1. Errores a nivel de nodo:**
- Capturar errores en ejecución individual
- Guardar error en estado de ejecución
- Marcar nodo como "error"
- Continuar ejecutando nodos independientes

**2. Errores a nivel de grafo:**
- Detección de ciclos → Detener ejecución, mostrar diálogo con camino del ciclo
- Dependencias faltantes → Skip de nodos dependientes
- Fallos críticos de API → Ofrecer retry o detener

**3. Feedback al usuario:**
- Notificaciones toast para completado/errores
- Badge de error en nodos fallidos con detalles al click
- Log de ejecución con timestamps

**Recuperación de errores:**
- Botón "Retry failed nodes"
- Opción "Execute from here" en menú contextual
- Auto-guardado de estado para reanudar

---

## Ejemplos de Ejecución

### Ejemplo 1: Workflow Lineal Simple
```
[Prompt] → [Image Generator] → [Draw] → [Image Generator]
```

**Orden de ejecución:**
1. Prompt (skipped - ya tiene datos)
2. Image Generator 1 (ejecutar async)
3. Draw (ejecutar después de IG1)
4. Image Generator 2 (ejecutar después de Draw)

**Timeline:**
```
0s:    Prompt [✓ skipped]
0s:    Image Generator 1 [⚡ executing...]
45s:   Image Generator 1 [✅ complete]
45s:   Draw [⚡ executing...]
46s:   Draw [✅ complete]
46s:   Image Generator 2 [⚡ executing...]
91s:   Image Generator 2 [✅ complete]
91s:   Workflow complete! 🎉
```

### Ejemplo 2: Ejecución Paralela
```
[Prompt 1] ┐
           ├→ [Image Generator 1]
[Prompt 2] ┘

[Image 1] ┐
          ├→ [Image Generator 2]
[Prompt 3] ┘
```

**Orden de ejecución:**
- Nivel 0: Prompt 1, Prompt 2, Image 1, Prompt 3 (todos skipped)
- Nivel 1: Image Generator 1, Image Generator 2 (ejecutados en paralelo)

**Timeline:**
```
0s:    Prompts e Image [✓ skipped]
0s:    IG1 [⚡ executing...] | IG2 [⚡ executing...]
45s:   IG1 [✅ complete]
47s:   IG2 [✅ complete]
47s:   Workflow complete! 🎉
```

### Ejemplo 3: Manejo de Errores
```
[Prompt] → [Image Generator] → [Draw] → [Text Generator]
           (falla)
```

**Ejecución:**
1. Prompt [✓ skipped]
2. Image Generator [❌ error: API timeout]
3. Draw [⏭️ skipped - falta input]
4. Text Generator [⏭️ skipped - falta input]

**UI muestra:**
- Badge de error en Image Generator
- "1 node failed, 2 nodes skipped"
- Botón "Retry failed nodes"
- Click en IG muestra detalles del error

---

## Plan de Implementación

### Fase 1: Fundamentos (Infraestructura Core)

**1.1 Crear utilidades de grafos**
- Archivo: `/src/lib/graph-utils.js`
- Implementar ordenamiento topológico (algoritmo de Kahn)
- Implementar detección de ciclos
- Añadir funciones de análisis de dependencias
- Tests unitarios para algoritmos de grafos

**1.2 Crear store de estado de ejecución**
- Archivo: `/src/stores/workflow-execution.js`
- Definir schema de estado de ejecución
- Añadir acciones para actualización de estado
- Añadir getters para valores computados

**1.3 Crear sistema de event bus**
- Archivo: `/src/lib/workflow-events.js`
- Event emitter simple para ejecución de nodos
- Interfaces TypeScript para eventos (si se usa TS)

### Fase 2: Motor de Ejecución

**2.1 Crear servicio WorkflowExecutor**
- Archivo: `/src/services/workflow-executor.js`
- Implementar algoritmo core de ejecución
- Añadir soporte para ejecución paralela
- Añadir funcionalidad pause/resume/stop
- Manejo de errores y recuperación

**2.2 Crear composable de workflow**
- Archivo: `/src/composables/useWorkflowExecution.js`
- Envolver WorkflowExecutor para componentes Vue
- Proveer bindings de estado reactivo
- Manejar lifecycle (cleanup on unmount)

**2.3 Añadir hooks de ejecución a nodos**
- Archivo: `/src/composables/useWorkflowEvents.js`
- Crear hook para que nodos escuchen solicitudes de ejecución
- Modificar ImageGeneratorNode.vue para usar hook
- Modificar TextGeneratorNode.vue para usar hook
- Manejar PromptNode, DrawNode (ya son reactivos)

### Fase 3: Componentes UI

**3.1 Crear componente WorkflowControls**
- Archivo: `/src/components/workflow/WorkflowControls.vue`
- Botones Play/Pause/Stop
- Display de progreso
- Integración con composable useWorkflowExecution

**3.2 Integrar en FloatingMenu**
- Archivo: `/src/components/canvas/FloatingMenu.vue`
- Añadir botón de control de workflow
- Posicionar panel WorkflowControls

**3.3 Añadir estado de ejecución a BaseNode**
- Archivo: `/src/components/base/BaseNode.vue`
- Añadir badge de estado de ejecución
- Añadir estilos basados en estado
- Animación de pulso para nodos en ejecución

**3.4 Añadir indicadores de estado de ejecución**
- Feedback visual: bordes, badges, animaciones
- Porcentaje de progreso en nodos (opcional)

### Fase 4: Pulido y Características

**4.1 UI de manejo de errores**
- Diálogo de error con visualización de ciclos
- Botón de retry para nodos fallidos
- Detalles de error en tooltip de nodo

**4.2 Características de ejecución inteligente**
- Skip de nodos con outputs válidos
- Opción "Execute from selected node"
- Opción "Execute selected nodes only"

**4.3 Log/historial de ejecución**
- Opcional: Panel deslizable con timeline de ejecución
- Duraciones de ejecución de nodos
- Información de debug

**4.4 Atajos de teclado**
- Cmd/Ctrl + Enter para ejecutar workflow
- Escape para detener ejecución

### Fase 5: Testing y Documentación

**5.1 Tests unitarios**
- Tests de utilidades de grafos
- Tests de lógica de ejecución
- Tests de manejo de estado

**5.2 Tests de integración**
- Escenarios de ejecución de workflow completo
- Escenarios de manejo de errores
- Escenarios de pause/resume

**5.3 Documentación**
- Guía de usuario para ejecución de workflow
- Docs de desarrollador para añadir ejecución a nuevos nodos
- Documentación de arquitectura

---

## Archivos Críticos a Crear/Modificar

### Nuevos archivos:
1. `/src/lib/graph-utils.js` - Algoritmos de grafos
2. `/src/services/workflow-executor.js` - Motor de ejecución
3. `/src/stores/workflow-execution.js` - Store de estado
4. `/src/lib/workflow-events.js` - Sistema de eventos
5. `/src/composables/useWorkflowExecution.js` - Composable principal
6. `/src/composables/useWorkflowEvents.js` - Hook para nodos
7. `/src/components/workflow/WorkflowControls.vue` - UI de controles

### Archivos a modificar:
1. `/src/components/base/BaseNode.vue` - Añadir indicadores de estado
2. `/src/components/canvas/FloatingMenu.vue` - Integrar controles
3. `/src/components/nodes/ImageGeneratorNode.vue` - Añadir hook de ejecución
4. `/src/components/nodes/TextGeneratorNode.vue` - Añadir hook de ejecución

---

## Consideraciones de Rendimiento

### Límites de Ejecución Paralela
- Por defecto: `maxParallelism = 3` (configurable)
- Previene saturar límites de rate de API
- Balancea velocidad con uso de recursos

### Manejo de Memoria
- Limpiar estado de ejecución después de completar (TTL configurable)
- No guardar logs grandes de ejecución en memoria
- Usar streaming de eventos para logs (persistencia opcional)

### Responsividad
- Ejecución corre en tareas async (no bloqueante)
- Actualizaciones de UI via stores reactivos (eficiente)
- Debounce de actualizaciones rápidas de estado (si es necesario)

---

## Mejoras Futuras (Post-MVP)

1. **Presets de ejecución**: Guardar/cargar configuraciones de ejecución
2. **Ejecución condicional**: Skip de nodos basado en condiciones
3. **Ramas de ejecución**: Ejecutar diferentes caminos según resultados
4. **Estimaciones de tiempo**: Predecir duración de workflow basado en historial
5. **Scheduling de ejecución**: Ejecutar workflows en momentos específicos
6. **Ejecución batch**: Ejecutar mismo workflow con diferentes inputs
7. **Re-ejecución parcial**: Re-ejecutar solo nodos modificados (ejecución incremental)
8. **Historial de ejecución**: Ver ejecuciones pasadas con resultados
9. **Templates de workflow**: Guardar workflows como templates reutilizables
10. **Sub-workflows**: Encapsular workflows como nodos

---

## Verificación y Testing

### Testing Manual:
1. **Workflow lineal simple**: Crear cadena Prompt → ImageGen → Draw, ejecutar workflow
2. **Workflow paralelo**: Crear múltiples ramas independientes, verificar ejecución paralela
3. **Manejo de errores**: Desconectar internet, verificar manejo de fallos de API
4. **Detección de ciclos**: Crear ciclo, verificar que se detecta y muestra error
5. **Pause/Resume**: Pausar durante ejecución, verificar reanudación correcta
6. **Skip inteligente**: Ejecutar workflow dos veces, verificar que segunda vez skipea nodos válidos

### Tests Automatizados:
1. **graph-utils.js**: Tests de ordenamiento topológico, detección de ciclos
2. **workflow-executor.js**: Tests de ejecución, manejo de errores, pause/resume
3. **workflow-execution store**: Tests de mutaciones y getters
4. **Integración**: Tests E2E de workflow completo desde UI

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FlowCanvasView.vue                       │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │ FloatingMenu     │         │ WorkflowControls     │     │
│  │ - Play button    │────────▶│ - Progress display   │     │
│  └──────────────────┘         └──────────────────────┘     │
│                                          │                  │
└──────────────────────────────────────────┼──────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────┐
                    │   useWorkflowExecution composable       │
                    │   - Manages executor instance           │
                    │   - Reactive state bindings             │
                    │   - Event handlers                      │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │   WorkflowExecutor Service              │
                    │   - Orchestrates execution              │
                    │   - Manages execution queue             │
                    │   - Emits events                        │
                    └───┬──────────────────────────────┬──────┘
                        │                              │
            ┌───────────▼─────────┐        ┌──────────▼──────────┐
            │  graph-utils.js     │        │ workflow-events.js  │
            │  - topologicalSort  │        │ - Event bus         │
            │  - detectCycles     │        │ - Node triggers     │
            └─────────────────────┘        └─────────────────────┘
                                                      │
                        ┌─────────────────────────────┼────────────────┐
                        │                             │                │
          ┌─────────────▼──────┐      ┌──────────────▼───┐  ┌────────▼───────┐
          │ ImageGeneratorNode │      │ TextGeneratorNode│  │ Other nodes... │
          │ - Listen for exec  │      │ - Listen for exec│  │                │
          │ - handleGenerate() │      │ - handleGenerate()│  │                │
          └────────────────────┘      └──────────────────┘  └────────────────┘

                    ┌───────────────────────────────────┐
                    │   Pinia Stores                    │
                    │ ┌───────────────────────────────┐ │
                    │ │ flowStore (existing)          │ │
                    │ │ - nodes, edges                │ │
                    │ └───────────────────────────────┘ │
                    │ ┌───────────────────────────────┐ │
                    │ │ workflowExecutionStore (new)  │ │
                    │ │ - execution state             │ │
                    │ │ - node statuses               │ │
                    │ │ - progress tracking           │ │
                    │ └───────────────────────────────┘ │
                    └───────────────────────────────────┘
```

---

## Resumen

Esta feature añade capacidad de ejecución automatizada de workflows a Flora, permitiendo a los usuarios ejecutar todos los nodos en el orden correcto con un solo click, similar a ComfyUI. La arquitectura propuesta:

- **Mínimamente invasiva**: No requiere refactorización de código existente
- **Modular**: Componentes bien separados y reutilizables
- **Escalable**: Soporta ejecución paralela y workflows complejos
- **Robusta**: Manejo completo de errores, ciclos y edge cases
- **User-friendly**: Feedback visual claro y controles intuitivos

La implementación se puede hacer de forma incremental, añadiendo valor en cada fase del desarrollo.
