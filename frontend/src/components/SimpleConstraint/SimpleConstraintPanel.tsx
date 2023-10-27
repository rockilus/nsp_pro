import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

type TreeNode = {
  component: 'select' | 'number' | 'text';
  options?: string[]; // for 'select' components
  placeholder?: string; // for 'text' and 'number' components
  next?: { [choice: string]: TreeNode } | (() => TreeNode);
};

const formDecisionTree: TreeNode = {
  component: 'select',
  options: ['at most', 'at least', 'when'],
  next: {
    'at most': {
      component: 'number',
      placeholder: 'Enter a number',
      next: () => ({
        component: 'select',
        options: ['off', 'night', 'morning'], // replace with actual shifts
        next: {
          'off': {
            component: 'select',
            placeholder: 'Timing',
            options: ['consecutive', 'daily', 'weekly'],
          },
        },
      }),
    },
    'at least': {
      component: 'number',
      placeholder: 'Enter a number',
      next: () => ({
        component: 'select',
        options: ['off', 'night', 'morning'], // replace with actual shifts
        next: {
          'Off': {
            component: 'select',
            options: ['consecutive', 'daily', 'weekly'],
          },
        },
      }),
    },
  },
};

type Block = {
  index: number;
  node: TreeNode;
  value?: string | number;
  ref: React.RefObject<any>;
} 


const SentenceBuilder: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([
    { index: 0, node: formDecisionTree, ref: React.createRef() }
  ]);

  const handleSelection = (choice: string | number, blockIndex: number) => {
    const currentBlock = blocks[blockIndex];
    const currentNode = currentBlock.node;
    let nextNode: TreeNode | undefined = undefined;

    if (typeof currentNode.next === 'function') {
      nextNode = currentNode.next();
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

      // Focus on the next block
      setTimeout(() => {
        nextBlock.ref.current?.focus();
      }, 0);
    } else {
      // If there's no next block, remove all blocks after the current block
      setBlocks(prevBlocks => prevBlocks.slice(0, blockIndex + 1));
    }
  };

  const renderComponent = (block: Block) => {
    const currentNode = block.node;
    const elementKey = block.index.toString();
    const commonProps = {
      fullWidth: false,
      readOnly: block.value !== undefined,
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
              {currentNode.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
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
        flexDirection: 'row',  // Change from 'column' to 'row'
        alignItems: 'center',
        gap: 2
      }}
    >
      <form autoComplete="off" style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
        {blocks.map(block => renderComponent(block))}
      </form>
      {/* Add a button to reset the form if needed */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setBlocks([{ index: 0, node: formDecisionTree, ref: React.createRef() }]);
        }}
      >
        Reset
      </Button>
    </Box>
  );
};

export default SentenceBuilder;
