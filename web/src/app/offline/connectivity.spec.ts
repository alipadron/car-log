import { TestBed } from '@angular/core/testing';

import { Connectivity } from './connectivity';

function setDeviceOnline(online: boolean): void {
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

describe('Connectivity', () => {
  it('starts reachable when the device is online', () => {
    expect(TestBed.inject(Connectivity).unreachable()).toBe(false);
  });

  it('reports reachable when a server response succeeds', () => {
    const conn = TestBed.inject(Connectivity);
    conn.reportServerFailure();
    expect(conn.unreachable()).toBe(true);

    conn.reportServerSuccess();
    expect(conn.unreachable()).toBe(false);
  });

  it('reports unreachable on a server failure', () => {
    const conn = TestBed.inject(Connectivity);

    conn.reportServerFailure();

    expect(conn.unreachable()).toBe(true);
  });

  it('is unreachable when the device goes offline', () => {
    const conn = TestBed.inject(Connectivity);

    setDeviceOnline(false);

    expect(conn.unreachable()).toBe(true);
  });

  it('recovers when the device comes back online', () => {
    const conn = TestBed.inject(Connectivity);
    setDeviceOnline(false);
    expect(conn.unreachable()).toBe(true);

    setDeviceOnline(true);
    expect(conn.unreachable()).toBe(false);
  });

  it('stays unreachable if the device is online but the server is down', () => {
    const conn = TestBed.inject(Connectivity);
    conn.reportServerFailure();
    setDeviceOnline(true);

    expect(conn.unreachable()).toBe(true);
  });
});
