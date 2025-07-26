
function TitleBar() {
    return React.createElement('div', { style: { background: '#eee', padding: '10px' } },
      React.createElement('button', null, 'Add'),
      React.createElement('button', null, 'Save')
    );
  }