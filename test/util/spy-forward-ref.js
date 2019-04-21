import { forwardRef } from 'react';

export const forwardRefSpied = (Component) => {
    const Forwarded = forwardRef(Component);

    Forwarded.render = jest.fn(Forwarded.render);

    return Forwarded;
};

export default forwardRefSpied;
