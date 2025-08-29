import { createReducer, on } from '@ngrx/store';

import { requestTypeEnum } from '../../models/navigation.enum';
import { Navigation } from '../../models/navigation.model';
import { selection } from '../actions/navigation.actions';
const initialState: Navigation = {
  requestType: requestTypeEnum.SINGLE,
};

export const navigationReducer = createReducer(
  initialState,
  on(selection, state => ({ ...state }))
);
