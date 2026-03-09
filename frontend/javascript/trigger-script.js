async function loadScript() {
  return await fetch('/testTriggerScript.txt').then(res => res.text())
}

function getCondition(tokens, lineNumber) {
  const ifIdx = tokens.findIndex(f => f === 'IF')
  const thenIdx = tokens.findIndex(f => f === 'THEN')
  if (ifIdx === -1 || thenIdx === -1) {
    throw new Error(`Invalid if statement at line ${lineNumber}`)
  }
  const condition = []
  for (let i = ifIdx + 1; i < thenIdx; i++) {
    condition.push(tokens[i])
  }
  if (condition.length < 1) {
    throw new Error(`Invalid if statement at line ${lineNumber}`)
  }
  return condition
}

export async function readTriggerScript(script) {
  const lines = script.split(/\r?\n/)

  const execute = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line === "") {
      i++
      continue
    }
    let tokens = line.split(/\s+/)
    tokens = tokens.map(f => f = f.toUpperCase())
    console.log(tokens)
    const command = tokens[0]

    let step
    switch (command) {
      case 'TELEPORT':
        const destX = parseInt(tokens[1], 10)
        const destY = parseInt(tokens[2], 10)
        const instant = tokens.includes('INSTANT')

        step = { type: "teleport", x: destX, y: destY, instant: instant }
        execute.push(step)
        break;
      case 'DELAY':
        const ms = parseInt(tokens[1], 10)

        step = { type: 'delay', ms: ms }
        execute.push(step)
        break
      case 'CHANGE':
        const changeX = parseInt(tokens[1], 10)
        const changeY = parseInt(tokens[2], 10)

        const blockIdx = tokens.findIndex(f => f === "BLOCK")
        const rotateIdx = tokens.findIndex(f => f === "ROTATE")
        const rotationIdx = tokens.findIndex(f => f === "ROTATION")

        step = { type: "change", x: changeX, y: changeY }
        if (blockIdx !== -1) {
          step.block = parseInt(tokens[blockIdx + 1], 10)
        }
        if (rotateIdx !== -1) {
          step.rotate = parseInt(tokens[rotateIdx + 1], 10)
        } else if (rotationIdx !== -1) {
          step.rotation = parseInt(tokens[rotationIdx + 1], 10)
        }
        if (step.block !== undefined || step.rotate !== undefined || step.rotation !== undefined) execute.push(step)
        break
      case 'FILL':
        const startX = parseInt(tokens[1], 10)
        const startY = parseInt(tokens[2], 10)
        const endX = parseInt(tokens[3], 10)
        const endY = parseInt(tokens[4], 10)

        step = { type: "fill", startX: startX, startY: startY, endY: endY, endX: endX }
        const blockIndex = tokens.findIndex(f => f === "BLOCK")
        if (blockIndex !== -1) {
          step.block = parseInt(tokens[blockIndex + 1], 10)
        } else {
          throw new Error(`Unable to find block at line ${i}`)
        }
        execute.push(step)
        break
      case 'IF':
        const condition = getCondition(tokens, i)

        step = { type: "if", condition: {} }

        if (condition[0] == "BLOCK") {
          step.condition.subject = "BLOCK"
          step.condition.x = parseInt(condition[1], 10)
          step.condition.y = parseInt(condition[2], 10)
        } else {
          throw new Error(`Syntax Error on line ${i}`)
        }

        // update this to include more operators later
        const operatorIndex = condition.findIndex(f => f === "IS")
        if (operatorIndex === -1) {
          throw new Error(`Syntax Error on line ${i}`)
        }

        step.condition.operator = condition[operatorIndex]
        step.condition.property = condition[operatorIndex + 1]
        step.condition.value = step.condition.property === "TYPE" ? condition[operatorIndex + 2] : parseInt(condition[operatorIndex + 2], 10)

        if (step.condition.operator === undefined || step.condition.property === undefined || step.condition.value === undefined) {
          throw new Error(`Syntax Error on line ${i}`)
        }
        execute.push(step)
        break
      case 'ELSE':
        step = { type: 'else' }
        execute.push(step)
        break
      case 'END':
        step = { type: 'end' }
        execute.push(step)
        break
      default:
        throw new Error(`Unknown Command "${command}" at line ${i + 1}`)
    }
    i++
  }
  console.log(execute)
  return execute
}

export function getTriggerScriptForLine(command) {
  let line = ""
  switch (command.type) {
    case "teleport":
      if (command.x === undefined || command.y === undefined) break
      line = `TELEPORT ${command.x} ${command.y}`
      break
    case "rotate":
      if (command.x === undefined || command.y === undefined || command.beforeRotation === undefined) break
      line = `CHANGE ${command.x} ${command.y} ROTATE ${command.beforeRotation}`
      break
    case "change":
      if (command.x === undefined || command.y === undefined) break
      line = `CHANGE ${command.x} ${command.y}`
      if (command.rotate !== undefined) {
        line += ` ROTATE ${command.rotate}`
      } else if (command.rotation !== undefined) {
        line += ` ROTATION ${command.rotation}`
      }
      if (command.block !== undefined) {
        line += ` BLOCK ${command.block}`
      }
      break
    case "if":
      if (command.condition === undefined) break
      const { condition } = command
      line = `IF`
      if (condition.subject !== undefined && condition.x !== undefined && condition.y !== undefined) {
        line += ` ${condition.subject} ${condition.x} ${condition.y}`
      }
      if (condition.operator !== undefined) {
        line += ` ${condition.operator}`
      }
      if (condition.property !== undefined) {
        line += ` ${condition.property}`
      }
      if (condition.value !== undefined) {
        line += ` ${condition.value}`
      }
      line += " THEN"
      break
    case "end":
      line = "END"
      break
    case "else":
      line = "ELSE"
      break
    case "fill":
      if (command.startX === undefined || command.startY === undefined || command.endX === undefined || command.endY === undefined || command.block === undefined) break
      line = `FILL ${command.startX} ${command.startY} ${command.endX} ${command.endY} BLOCK ${command.block}`
      break
    case "delay":
      if (command.ms === undefined) break
      line = `DELAY ${command.ms}`
      break
  }
  return line
}

export function compileToTriggerScript(execute) {
  let out = ""
  for (const step of execute) {
    const line = getTriggerScriptForLine(step)
    out += `${line}\n`
  }
  return out
}