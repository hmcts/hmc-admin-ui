Feature: Initial Functional test

    Scenario: The home page loads
        When I go to '/'
        Then the page should include 'Admin UI - Support Tools'
