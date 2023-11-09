import React, { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { ShiftT } from './types';
import { useConstraintStore } from '../../stores/constraintStore';
import { BuildBlockNameT } from '../Constraint/types';

type TreeNode = {
  name: 'type' | 'operator' | 'quantity' | 'shift_id' | 'day';
  component: 'select' | 'number' | 'text';
  options?: OptionT[]; // for 'select' components
  placeholder?: string; // for 'text' and 'number' components
  next?: { [choice: string]: TreeNode } | ((value: any) => TreeNode);
};

type OptionT = {
  value: string;
  label: string;
  possibleTypes?: string[];  // TODO: needs typing later on
}

const formDecisionTree = (shifts: ShiftT[]) => {
  const nodeSelectTiming = (shift_id: string): TreeNode => ({
    component: 'select',
    name: 'day', // 'timing' would be better
    placeholder: 'Timing',
    options: [{
      value: 'consecutive',
      label: 'Consecutive',
      possibleTypes: ['sequence'],
    }, {
      value: 'week',
      label: 'Weekly',
      possibleTypes: ['sum'],
    }],
  });
  const nodeSelectShift = (nextFn: (value: any) => TreeNode) => {
    const node: TreeNode = {
      component: 'select',
      name: 'shift_id',
      options: shifts.map(shift => ({
        value: shift.id,
        label: shift.name,
      })),
      next: nextFn,
    };
    return node;
  };
  const rootNode: TreeNode = {
    name: 'operator',
    component: 'select',
    options: [{
      value: 'at most',
      label: 'At most',
      possibleTypes: ['sum', 'sequence'],
    }, {
      value: 'Exactly', //  'equal' would be better
      label: 'Exactly',
      possibleTypes: ['sum', 'sequence'],
    }, {
      value: 'at least',
      label: 'At least',
      possibleTypes: ['sum', 'sequence'],
    }, {
      value: 'when',
      label: 'When',
      possibleTypes: ['order'],
    },
  ],
    next: (choice: string): TreeNode => {
      if (choice === 'order') {
        
        const nodeSelectDay = {
          name: 'quantity',
          component: 'number',
          placeholder: 'Enter a number',
          next: (value: number) => nodeSelectShift(nodeSelectTiming),
        };
        const nextNode: TreeNode = nodeSelectShift(nodeSelectTiming);
        return nextNode;
      }
      // default
      return ({
        name: 'quantity',
        component: 'number',
        placeholder: 'Enter a number',
        next: (value: number) => nodeSelectShift(nodeSelectTiming),
        });
    },
  };

  return rootNode;
};

type Block = {
  index: number;
  node: TreeNode;
  value?: string | number;
  possibleTypes?: string[];  // TODO: needs typing later on
  ref: React.RefObject<any>;
} 

interface BlockOutT {
  name: BuildBlockNameT;
  value: string | number;
}

interface SentenceBuilderProps {
  shifts: ShiftT[];
  onSubmit: (blocks: BlockOutT[]) => void;
}

const SentenceBuilder: React.FC<SentenceBuilderProps> = ({ shifts, onSubmit }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isSentenceComplete, setIsSentenceComplete] = useState<boolean>(false);

  useEffect(() => {
    // This code will run whenever `shifts` changes
    setBlocks([
      { index: 0, node: formDecisionTree(shifts), ref: React.createRef() }
    ]);
  }, [shifts]);

  const handleSelection = (choice: string | number, blockIndex: number) => {
    const currentBlock = blocks[blockIndex];
    currentBlock.value = choice;
    if (currentBlock.node.options) {
      const selectedOption = currentBlock.node.options.find(option => option.value === choice);
      if (selectedOption?.possibleTypes) {
        currentBlock.possibleTypes = selectedOption.possibleTypes;
      }
    }
    const currentNode = currentBlock.node;
    let nextNode: TreeNode | undefined = undefined;

    if (typeof currentNode.next === 'function') {
      nextNode = currentNode.next(choice);
    } else if (currentNode.next && typeof choice === 'string') {
      nextNode = currentNode.next[choice];
    }

    if (nextNode) {
      const nextBlock = {
        index: currentBlock.index + 1,
        node: nextNode,
        ref: React.createRef<HTMLInputElement | HTMLSelectElement>(),
      };
      // Remove all blocks after the current block and add the next block
      setBlocks(prevBlocks => [
        ...prevBlocks.slice(0, blockIndex + 1),
        nextBlock
      ]);
      setIsSentenceComplete(false);

      // Focus on the next block: does not work
      setTimeout(() => {
        nextBlock.ref.current?.focus();
      }, 0);
    } else {
      // If there's no next block, remove all blocks after the current block
      setBlocks(prevBlocks => prevBlocks.slice(0, blockIndex + 1));
      setIsSentenceComplete(true);
    }
  };

  const handleOnSubmit = (blocks: Block[]) => {
    console.log(blocks);
    let possibleTypes = ['sum', 'sequence', 'order'];
    blocks.filter(b => b.possibleTypes !== undefined).forEach(b => {
      possibleTypes = possibleTypes.filter(t => b.possibleTypes!.includes(t));
    })

    if (possibleTypes.length != 1) {
      console.error('possibleTypes', possibleTypes);
      throw new Error('There should be exactly one possible type');
    }

    const buildBlocks = blocks.map(block => ({
        name: block.node.name,
        value: block.value as string,
      }));
    buildBlocks.push({
      name: 'type',
      value: possibleTypes[0],
    });

    onSubmit(buildBlocks);
  }

  const renderComponent = (block: Block) => {
    const currentNode = block.node;
    const elementKey = block.index.toString();
    const commonProps = {
      fullWidth: false,
      // readOnly: block.value !== undefined,
    };
    const value = block.value !== undefined ? block.value : "";

    switch (currentNode.component) {
      case 'select':
        return (
          <FormControl fullWidth key={elementKey}>
            <InputLabel id={`${elementKey}-label`}>Select</InputLabel>
            <Select
              {...commonProps}
              value={value}
              labelId={`${elementKey}-label`}
              ref={block.ref}
              onChange={(e) => handleSelection(e.target.value as string, block.index)}
            >
              {currentNode.options?.map((option, i) => (
                <MenuItem key={i} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'number':
        return (
          <TextField
            {...commonProps}
            value={value}
            key={elementKey}
            ref={block.ref}
            type="number"
            placeholder={currentNode.placeholder}
            onChange={(e) => handleSelection(parseInt(e.target.value), block.index)}
            fullWidth
            />
            );
      case 'text':
        return (
          <TextField
            {...commonProps}
            value={value}
            ref={block.ref}
            key={elementKey}
            placeholder={currentNode.placeholder}
            onChange={(e) => handleSelection(e.target.value, block.index)}
            fullWidth
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2
      }}
    >
      <form autoComplete="off" style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
        {blocks.map(block => renderComponent(block))}
      </form>
      
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setBlocks([{ index: 0, node: formDecisionTree(shifts), ref: React.createRef() }]);
        }}
      >
        Reset
      </Button>

      <Button
        variant="contained"
        color="secondary"
        disabled={!isSentenceComplete}
        onClick={() => handleOnSubmit(blocks)}
      >
        Submit
      </Button>

      
    </Box>
  );
};


interface ConstraintPanelProps {
  shifts: ShiftT[];
}

const ConstraintPanel: React.FC<ConstraintPanelProps> = ({ shifts }) => {
  const addConstraint = useConstraintStore((state) => state.addConstraint);
  
  const handleSubmit = (blocks: BlockOutT[]) => {
    const constraint = {
      buildBlocks: blocks,
      id: '',
      hard: true,
      priority: 'low',
      active: true,
    };
    addConstraint(constraint);
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SentenceBuilder shifts={shifts} onSubmit={handleSubmit} />
    </Box>
  )
};

export default ConstraintPanel;