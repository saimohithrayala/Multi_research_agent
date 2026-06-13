from backend.agent import build_search_agent,build_reader_agent,writer_chain,critic_chain

def run_pipeline(topic: str) -> dict :

  state = {}

    #search agent working 

  print(" search agent is working ...")

  search_agent = build_search_agent()
  search_result = search_agent.invoke({
    'messages' :[("user",f"find recent, reliable and detailed information about:{topic}")]
  })
  state["search_results"] = search_result['messages'][-1].content

  #Render agent

  print("Reader agent is scraping top resources ...")
  render_agent = build_reader_agent()
  reader_result = render_agent.invoke({
    'messages' : [('user',
          f"Based on the following search results about '{topic}', "
          f"pick the most relevant URL and scrape it for deeper content.\n\n"
          f"Search Results:\n{state['search_results'][:500]}")]
  })
  state['scraped_content'] = reader_result['messages'][-1].content

  #writer chain
  
  print("Writer is drafting the report ...")

  research_combined = (
    f"SEARCH_RESULTS = \n {state['search_results']}\n\n"
    f"RENDER_CONTENT = \n{state['scraped_content']}"
  )

  state['report']= writer_chain.invoke({
    "topic": topic,
    "research" : research_combined
  })

  print("\n final report : \n",state['report'])

  #critic report 
  state['feedback']=critic_chain.invoke({
    "report" : state['report']
  })
  print("\n critic report \n", state['feedback'])
  
  return state

if __name__ == '__main__':
  topic = input("\n Enter a Reserch Topic :")
  run_pipeline(topic)