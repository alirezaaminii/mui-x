import * as React from 'react';
import TextField from '@mui/material/TextField';
import { expect } from 'chai';
import { spy } from 'sinon';
import { act, fireEvent, screen, userEvent } from '@mui/monorepo/test/utils';
import { DesktopDateTimePicker } from '@mui/x-date-pickers/DesktopDateTimePicker';
import { inputBaseClasses } from '@mui/material/InputBase';
import {
  adapterToUse,
  createPickerRenderer,
  FakeTransitionComponent,
  openPicker,
  getClockMouseEvent,
  withPickerControls,
} from 'test/utils/pickers-utils';
import { describeValidation } from '@mui/x-date-pickers/tests/describeValidation';

const WrappedDesktopDateTimePicker = withPickerControls(DesktopDateTimePicker)({
  components: { DesktopTransition: FakeTransitionComponent },
  renderInput: (params) => <TextField {...params} />,
});

describe('<DesktopDateTimePicker />', () => {
  const { render, clock } = createPickerRenderer({
    clock: 'fake',
    clockConfig: new Date('2018-01-01T10:05:05.000'),
  });

  describeValidation(DesktopDateTimePicker, () => ({
    render,
    clock,
    views: ['year', 'month', 'day', 'hours', 'minutes'],
    componentFamily: 'legacy-picker',
  }));

  ['readOnly', 'disabled'].forEach((prop) => {
    it(`cannot be opened when "Choose time" is clicked when ${prop}={true}`, () => {
      const handleOpen = spy();
      render(
        <DesktopDateTimePicker
          value={adapterToUse.date(new Date(2019, 0, 1))}
          {...{ [prop]: true }}
          onChange={() => {}}
          onOpen={handleOpen}
          open={false}
          renderInput={(params) => <TextField {...params} />}
        />,
      );

      act(() => {
        userEvent.mousePress(screen.getByLabelText(/Choose date/));
      });

      expect(handleOpen.callCount).to.equal(0);
    });
  });

  it('prop: mask – should take the mask prop into account', () => {
    render(
      <WrappedDesktopDateTimePicker
        initialValue={null}
        inputFormat="mm.dd.yyyy hh:mm"
        mask="__.__.____ __:__"
      />,
    );

    const textbox = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(textbox, {
      target: {
        value: '12',
      },
    });

    expect(textbox.value).to.equal('12.');
  });

  it('prop: maxDateTime – minutes is disabled by date part', () => {
    render(
      <DesktopDateTimePicker
        open
        openTo="minutes"
        onChange={() => {}}
        renderInput={(params) => <TextField {...params} />}
        value={adapterToUse.date(new Date(2018, 0, 1, 12))}
        minDateTime={adapterToUse.date(new Date(2018, 0, 1, 12, 30))}
      />,
    );

    expect(screen.getByLabelText('25 minutes')).to.have.class('Mui-disabled');
    expect(screen.getByLabelText('35 minutes')).not.to.have.class('Mui-disabled');
  });

  it('prop: minDateTime – hours is disabled by date part', () => {
    render(
      <DesktopDateTimePicker
        open
        openTo="hours"
        onChange={() => {}}
        ampm={false}
        renderInput={(params) => <TextField {...params} />}
        value={adapterToUse.date(new Date(2018, 0, 1))}
        minDateTime={adapterToUse.date(new Date(2018, 0, 1, 12, 30))}
      />,
    );

    expect(screen.getByLabelText('11 hours')).to.have.class('Mui-disabled');
  });

  [true, false].forEach((ampm) =>
    it(`prop: ampm - should set working default mask/inputFormat when ampm=${ampm}`, () => {
      const onChange = spy();
      render(
        <DesktopDateTimePicker
          ampm={ampm}
          renderInput={(params) => <TextField {...params} />}
          onChange={onChange}
          value={null}
        />,
      );

      // Call `onChange` with a 24h date-time
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '12/01/1999 10:12' },
      });
      expect(onChange.callCount).to.equal(1);
      expect(adapterToUse.isValid(onChange.lastCall.args[0])).to.equal(!ampm);

      // Call `onChange` with a 12h date-time. The mask will remove the am/pm
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '12/01/1999 10:12 am' },
      });
      expect(adapterToUse.isValid(onChange.lastCall.args[0])).to.equal(true);
    }),
  );

  it('shows ArrowSwitcher on ClockView disabled and not allows to return back to the date', () => {
    render(
      <DesktopDateTimePicker
        open
        openTo="hours"
        onChange={() => {}}
        renderInput={(params) => <TextField {...params} />}
        value={adapterToUse.date(new Date(2018, 0, 1))}
      />,
    );

    expect(screen.getByLabelText('open previous view')).to.have.attribute('disabled');
  });

  it('allows to switch using ArrowSwitcher on ClockView', () => {
    render(
      <DesktopDateTimePicker
        open
        openTo="hours"
        onChange={() => {}}
        renderInput={(params) => <TextField {...params} />}
        value={adapterToUse.date(new Date(2018, 0, 1))}
      />,
    );

    fireEvent.click(screen.getByLabelText('open next view'));
    expect(screen.getByLabelText('open next view')).to.have.attribute('disabled');
  });

  it('should respect `disableFuture` prop', async () => {
    const onChange = spy();
    render(
      <WrappedDesktopDateTimePicker
        initialValue={adapterToUse.date(new Date('2018-01-01T11:00:00.000'))}
        onChange={onChange}
        ampm={false}
        disableFuture
      />,
    );

    expect(screen.getByRole('textbox').parentElement).to.have.class(inputBaseClasses.error);

    openPicker({ type: 'date-time', variant: 'desktop' });

    // re-select current day
    userEvent.mousePress(screen.getByRole('gridcell', { selected: true }));
    expect(screen.getByRole('option', { name: '11 hours' })).to.have.class(
      inputBaseClasses.disabled,
    );
    expect(screen.getByRole('option', { name: '12 hours' })).to.have.class(
      inputBaseClasses.disabled,
    );

    // click on `10 hours`
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove', 30, 65));
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup', 30, 65));
    expect(screen.getByRole('option', { name: '10 minutes' })).to.have.class(
      inputBaseClasses.disabled,
    );

    // click on `05 minutes`
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove', 155, 30));
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup', 155, 30));

    expect(screen.getByRole('textbox').parentElement).not.to.have.class(inputBaseClasses.error);
    expect(onChange.lastCall.args[0]).toEqualDateTime(new Date('2018-01-01T10:05:00.000'));
  });

  it('should respect `disablePast` prop', () => {
    const onChange = spy();
    render(
      <WrappedDesktopDateTimePicker
        initialValue={adapterToUse.date(new Date('2018-01-01T09:00:00.000'))}
        onChange={onChange}
        ampm={false}
        disablePast
      />,
    );

    openPicker({ type: 'date-time', variant: 'desktop' });

    expect(screen.getByRole('textbox').parentElement).to.have.class(inputBaseClasses.error);

    // re-select current day
    userEvent.mousePress(screen.getByRole('gridcell', { selected: true }));
    expect(screen.getByRole('option', { name: '8 hours' })).to.have.class(
      inputBaseClasses.disabled,
    );
    expect(screen.getByRole('option', { name: '9 hours' })).to.have.class(
      inputBaseClasses.disabled,
    );

    // click on `10 hours`
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove', 30, 65));
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup', 30, 65));
    expect(screen.getByRole('option', { name: '00 minutes' })).to.have.class(
      inputBaseClasses.disabled,
    );
    expect(screen.getByRole('option', { name: '05 minutes' })).to.have.class(
      inputBaseClasses.disabled,
    );

    // click minutes
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
    fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));

    expect(screen.getByRole('textbox').parentElement).not.to.have.class(inputBaseClasses.error);
    expect(onChange.lastCall.args[0]).toEqualDateTime(new Date('2018-01-01T10:53:00.000'));
  });

  describe('Component slots: Popper', () => {
    it('should forward onClick and onTouchStart', () => {
      const handleClick = spy();
      const handleTouchStart = spy();
      render(
        <WrappedDesktopDateTimePicker
          open
          componentsProps={{
            popper: {
              onClick: handleClick,
              onTouchStart: handleTouchStart,
              // @ts-expect-error `data-*` attributes are not recognized in props objects
              'data-testid': 'popper',
            },
          }}
          initialValue={null}
        />,
      );
      const popper = screen.getByTestId('popper');

      fireEvent.click(popper);
      fireEvent.touchStart(popper);

      expect(handleClick.callCount).to.equal(1);
      expect(handleTouchStart.callCount).to.equal(1);
    });
  });

  describe('Component slots: DesktopPaper', () => {
    it('should forward onClick and onTouchStart', () => {
      const handleClick = spy();
      const handleTouchStart = spy();
      render(
        <WrappedDesktopDateTimePicker
          open
          componentsProps={{
            desktopPaper: {
              onClick: handleClick,
              onTouchStart: handleTouchStart,
              // @ts-expect-error `data-*` attributes are not recognized in props objects
              'data-testid': 'paper',
            },
          }}
          initialValue={null}
        />,
      );
      const paper = screen.getByTestId('paper');

      fireEvent.click(paper);
      fireEvent.touchStart(paper);

      expect(handleClick.callCount).to.equal(1);
      expect(handleTouchStart.callCount).to.equal(1);
    });
  });

  describe('picker state', () => {
    it('should open when clicking "Choose date"', () => {
      const onOpen = spy();

      render(<WrappedDesktopDateTimePicker onOpen={onOpen} initialValue={null} />);

      userEvent.mousePress(screen.getByLabelText(/Choose date/));

      expect(onOpen.callCount).to.equal(1);
      expect(screen.queryByRole('dialog')).toBeVisible();
    });

    it('should call onChange when selecting each view and onClose and onAccept when selecting the minutes', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
        />,
      );

      // Open the picker
      openPicker({ type: 'date-time', variant: 'desktop' });
      expect(onChange.callCount).to.equal(0);
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);

      // Change the year
      userEvent.mousePress(screen.getByLabelText(/switch to year view/));
      userEvent.mousePress(screen.getByText('2010', { selector: 'button' }));
      expect(onChange.callCount).to.equal(1);
      expect(onChange.lastCall.args[0]).toEqualDateTime(new Date(2010, 0, 1));

      // Change the date
      userEvent.mousePress(screen.getByRole('gridcell', { name: '15' }));
      expect(onChange.callCount).to.equal(2);
      expect(onChange.lastCall.args[0]).toEqualDateTime(new Date(2010, 0, 15));

      // Change the hours
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));
      expect(onChange.callCount).to.equal(3);
      expect(onChange.lastCall.args[0]).toEqualDateTime(new Date(2010, 0, 15, 11));

      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);

      // Change the minutes
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));
      expect(onChange.callCount).to.equal(4);
      expect(onChange.lastCall.args[0]).toEqualDateTime(new Date(2010, 0, 15, 11, 53));

      expect(onAccept.callCount).to.equal(1);
      expect(onClose.callCount).to.equal(1);
    });

    it('should not call onClose and onAccept when selecting the minutes if props.closeOnSelect = false', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
          closeOnSelect={false}
        />,
      );

      openPicker({ type: 'date-time', variant: 'desktop' });

      // Change the date (already tested)
      userEvent.mousePress(screen.getByRole('gridcell', { name: '15' }));

      // Change the hours (already tested)
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));

      // Change the minutes (already tested)
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));

      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);
    });

    it('should call onClose and onAccept with the live value when pressing Escape', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
        />,
      );

      openPicker({ type: 'date-time', variant: 'desktop' });

      // Change the date (already tested)
      userEvent.mousePress(screen.getByRole('gridcell', { name: '15' }));

      // Change the hours (already tested)
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));

      // Dismiss the picker
      // eslint-disable-next-line material-ui/disallow-active-element-as-key-event-target -- don't care
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(onChange.callCount).to.equal(2); // Date change + hours change
      expect(onAccept.callCount).to.equal(1);
      expect(onAccept.lastCall.args[0]).toEqualDateTime(new Date(2018, 0, 15, 11));
      expect(onClose.callCount).to.equal(1);
    });

    it('should call onClose when clicking outside of the picker without prior change', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
        />,
      );

      openPicker({ type: 'date-time', variant: 'desktop' });

      // Dismiss the picker
      userEvent.mousePress(document.body);
      expect(onChange.callCount).to.equal(0);
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(1);
    });

    it('should call onClose and onAccept with the live value when clicking outside of the picker', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
        />,
      );

      openPicker({ type: 'date-time', variant: 'desktop' });

      // Change the date (already tested)
      userEvent.mousePress(screen.getByRole('gridcell', { name: '15' }));

      // Change the hours (already tested)
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));

      // Dismiss the picker
      userEvent.mousePress(document.body);
      expect(onChange.callCount).to.equal(2); // Date change + hours change
      expect(onAccept.callCount).to.equal(1);
      expect(onAccept.lastCall.args[0]).toEqualDateTime(new Date(2018, 0, 15, 11));
      expect(onClose.callCount).to.equal(1);
    });

    it('should not call onClose or onAccept when clicking outside of the picker if not opened', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
        />,
      );

      // Dismiss the picker
      userEvent.mousePress(document.body);
      expect(onChange.callCount).to.equal(0);
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);
    });

    it('should call onClose, onChange with empty value and onAccept with empty value when pressing the "Clear" button', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();
      const initialValue = adapterToUse.date(new Date(2018, 0, 1));

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={initialValue}
          componentsProps={{ actionBar: { actions: ['clear'] } }}
        />,
      );

      openPicker({ type: 'date-time', variant: 'desktop' });

      // Clear the date
      fireEvent.click(screen.getByText(/clear/i));
      expect(onChange.callCount).to.equal(1);
      expect(onChange.lastCall.args[0]).to.equal(null);
      expect(onAccept.callCount).to.equal(1);
      expect(onAccept.lastCall.args[0]).to.equal(null);
      expect(onClose.callCount).to.equal(1);
    });

    it('should not call onChange or onAccept when pressing "Clear" button with an already null value', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={null}
          componentsProps={{ actionBar: { actions: ['clear'] } }}
        />,
      );

      openPicker({ type: 'date-time', variant: 'desktop' });

      // Clear the date
      fireEvent.click(screen.getByText(/clear/i));
      expect(onChange.callCount).to.equal(0);
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(1);
    });

    it('should call onAccept when selecting the same date and time after changing the year', () => {
      const onChange = spy();
      const onAccept = spy();
      const onClose = spy();

      render(
        <WrappedDesktopDateTimePicker
          onChange={onChange}
          onAccept={onAccept}
          onClose={onClose}
          initialValue={adapterToUse.date(new Date(2018, 0, 1, 11, 53))}
          openTo="year"
        />,
      );

      openPicker({ type: 'date', variant: 'desktop' });

      // Select year
      userEvent.mousePress(screen.getByRole('button', { name: '2025' }));
      expect(onChange.callCount).to.equal(1);
      expect(onChange.lastCall.args[0]).toEqualDateTime(new Date(2025, 0, 1, 11, 53));
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);

      // Change the date (same value)
      userEvent.mousePress(screen.getByRole('gridcell', { name: '1' }));
      expect(onChange.callCount).to.equal(1); // Don't call onChange again since the value did not change
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);

      // Change the hours (same value)
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));
      expect(onChange.callCount).to.equal(1); // Don't call onChange again since the value did not change
      expect(onAccept.callCount).to.equal(0);
      expect(onClose.callCount).to.equal(0);

      // Change the minutes (same value)
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mousemove'));
      fireEvent(screen.getByMuiTest('clock'), getClockMouseEvent('mouseup'));
      expect(onChange.callCount).to.equal(1); // Don't call onChange again since the value did not change
      expect(onAccept.callCount).to.equal(1);
      expect(onAccept.lastCall.args[0]).toEqualDateTime(new Date(2025, 0, 1, 11, 53));
      expect(onClose.callCount).to.equal(1);
    });
  });

  describe('localization', () => {
    it('should respect the `localeText` prop', () => {
      render(
        <WrappedDesktopDateTimePicker
          initialValue={null}
          localeText={{ cancelButtonLabel: 'Custom cancel' }}
          componentsProps={{ actionBar: { actions: ['cancel'] } }}
        />,
      );
      openPicker({ type: 'date', variant: 'desktop' });

      expect(screen.queryByText('Custom cancel')).not.to.equal(null);
    });
  });
});
